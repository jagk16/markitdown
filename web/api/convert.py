import io
import json
import os
import re
import uuid
from http.server import BaseHTTPRequestHandler
from typing import Any
from urllib.parse import urlparse

import requests
from markitdown import (
    FileConversionException,
    MarkItDown,
    MissingDependencyException,
    StreamInfo,
    UnsupportedFormatException,
)

ALLOWED_EXTENSIONS = {
    ".pdf",
    ".docx",
    ".pptx",
    ".xlsx",
    ".xls",
    ".html",
    ".htm",
    ".csv",
    ".json",
    ".xml",
    ".epub",
    ".ipynb",
    ".zip",
    ".msg",
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".webp",
    ".wav",
    ".mp3",
    ".m4a",
    ".txt",
    ".md",
    ".rtf",
}

BLOB_HOST_PATTERN = re.compile(
    r"^([a-z0-9-]+\.)?((public|private)\.)?blob\.vercel-storage\.com$",
    re.IGNORECASE,
)

PREVIEW_CHAR_LIMIT = 50_000
BLOB_TTL_SECONDS = 3600

_markitdown_instance: MarkItDown | None = None


def max_file_size_bytes() -> int:
    raw = (
        os.environ.get("MAX_FILE_SIZE_MB")
        or os.environ.get("NEXT_PUBLIC_MAX_FILE_SIZE_MB")
        or "25"
    )
    return int(raw) * 1024 * 1024


def max_file_size_mb_label() -> str:
    return (
        os.environ.get("MAX_FILE_SIZE_MB")
        or os.environ.get("NEXT_PUBLIC_MAX_FILE_SIZE_MB")
        or "25"
    )


def extract_pdf_with_pypdf(pdf_bytes: bytes) -> str:
    from pypdf import PdfReader

    reader = PdfReader(io.BytesIO(pdf_bytes))
    chunks: list[str] = []
    for i, page in enumerate(reader.pages):
        text = page.extract_text() or ""
        if text.strip():
            chunks.append(f"<!-- Página {i + 1} -->\n\n{text.strip()}")
    return "\n\n".join(chunks)


def extract_pdf_with_pymupdf(pdf_bytes: bytes) -> str:
    import fitz

    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    chunks: list[str] = []
    try:
        for i in range(doc.page_count):
            text = doc[i].get_text() or ""
            if text.strip():
                chunks.append(f"<!-- Página {i + 1} -->\n\n{text.strip()}")
    finally:
        doc.close()
    return "\n\n".join(chunks)


def extract_pdf_fallback(pdf_bytes: bytes) -> str:
    for extractor in (extract_pdf_with_pypdf, extract_pdf_with_pymupdf):
        try:
            text = extractor(pdf_bytes)
            if text.strip():
                return text
        except Exception:
            continue
    return ""


def _excel_format_cell(value: Any) -> str:
    if value is None:
        return ""
    try:
        import pandas as pd

        if pd.isna(value):
            return ""
    except (TypeError, ValueError):
        pass
    if isinstance(value, float) and value == int(value):
        return str(int(value))
    text = str(value).strip()
    if text.lower() in {"nan", "none", "<na>"}:
        return ""
    return text


def _excel_row_is_empty(values: Any) -> bool:
    return all(not _excel_format_cell(v) for v in values)


def _excel_escape_md_cell(text: str) -> str:
    return text.replace("|", "\\|").replace("\n", " ")


def _excel_trim_empty_columns(block: Any) -> Any:
    import pandas as pd

    if block.empty:
        return block
    keep = [col for col in block.columns if not _excel_row_is_empty(block[col].values)]
    return block.loc[:, keep]


def _excel_split_sheet_blocks(df: Any) -> list[Any]:
    blocks: list[Any] = []
    row_indices: list[int] = []

    for index in range(len(df)):
        row = df.iloc[index]
        if _excel_row_is_empty(row.values):
            if row_indices:
                blocks.append(df.iloc[row_indices].copy())
                row_indices = []
            continue
        row_indices.append(index)

    if row_indices:
        blocks.append(df.iloc[row_indices].copy())

    return blocks


def _excel_block_to_markdown(block: Any) -> str:
    rows: list[list[str]] = []
    for _, row in block.iterrows():
        cells = [_excel_format_cell(v) for v in row.values]
        while cells and not cells[-1]:
            cells.pop()
        if any(cells):
            rows.append(cells)

    if not rows:
        return ""

    max_cols = max(len(r) for r in rows)
    normalized = [r + [""] * (max_cols - len(r)) for r in rows]

    lines = [
        "| " + " | ".join(_excel_escape_md_cell(c) for c in normalized[0]) + " |",
        "| " + " | ".join("---" for _ in range(max_cols)) + " |",
    ]
    for row in normalized[1:]:
        lines.append("| " + " | ".join(_excel_escape_md_cell(c) for c in row) + " |")

    return "\n".join(lines)


def convert_excel_bytes_to_markdown(data: bytes, extension: str) -> str:
    import pandas as pd

    engine = "openpyxl" if extension == ".xlsx" else "xlrd"
    sheets = pd.read_excel(io.BytesIO(data), sheet_name=None, header=None, engine=engine)

    parts: list[str] = []
    for sheet_name, raw_df in sheets.items():
        try:
            if raw_df.empty:
                continue

            blocks = _excel_split_sheet_blocks(raw_df)
            sheet_parts: list[str] = []

            for block in blocks:
                block = _excel_trim_empty_columns(block.reset_index(drop=True))
                table = _excel_block_to_markdown(block)
                if table:
                    sheet_parts.append(table)

            if sheet_parts:
                safe_name = re.sub(r"\s+", " ", str(sheet_name).strip()) or "Hoja"
                parts.append(f"## {safe_name}")
                parts.extend(sheet_parts)
        except Exception:
            continue

    return "\n\n".join(parts).strip()


def get_markitdown() -> MarkItDown:
    global _markitdown_instance
    if _markitdown_instance is None:
        _markitdown_instance = MarkItDown(enable_plugins=False)
    return _markitdown_instance


def is_allowed_blob_url(url: str) -> bool:
    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"}:
        return False
    hostname = parsed.hostname or ""
    return bool(BLOB_HOST_PATTERN.match(hostname))


def get_extension(filename: str) -> str:
    dot = filename.rfind(".")
    return filename[dot:].lower() if dot >= 0 else ""


def get_blob_access() -> str:
    return os.environ.get("BLOB_ACCESS_MODE", "public").lower()


def upload_markdown_to_blob(content: str, original_filename: str) -> dict[str, str]:
    token = os.environ.get("BLOB_READ_WRITE_TOKEN")
    if not token:
        raise ValueError("BLOB_READ_WRITE_TOKEN no configurado.")

    stem = os.path.splitext(os.path.basename(original_filename))[0] or "document"
    safe_stem = re.sub(r"[^a-zA-Z0-9._-]", "-", stem)[:80]
    pathname = f"outputs/{safe_stem}-{uuid.uuid4().hex[:10]}.md"

    response = requests.put(
        f"https://blob.vercel-storage.com/{pathname}",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "text/markdown; charset=utf-8",
            "x-vercel-blob-access": get_blob_access(),
            "x-content-type": "text/markdown; charset=utf-8",
            "cache-control-max-age": str(BLOB_TTL_SECONDS),
        },
        data=content.encode("utf-8"),
        timeout=120,
    )

    if response.status_code >= 400:
        try:
            detail = response.json().get("error", response.text)
        except Exception:
            detail = response.text[:500]
        raise ValueError(f"No se pudo guardar el Markdown en Blob: {detail}")

    payload = response.json()
    blob_url = payload.get("downloadUrl") or payload.get("url", "")
    if blob_url and "download=" not in blob_url:
        sep = "&" if "?" in blob_url else "?"
        blob_url = f"{blob_url}{sep}download=1"

    return {
        "downloadUrl": blob_url,
        "downloadPath": payload.get("pathname", pathname),
    }


def download_blob(url: str) -> bytes:
    if not is_allowed_blob_url(url):
        raise ValueError("Solo se permiten URLs de Vercel Blob del proyecto.")

    response = requests.get(url, timeout=120)
    response.raise_for_status()

    content = response.content
    if len(content) > max_file_size_bytes():
        raise ValueError(
            f"El archivo supera el límite de {max_file_size_mb_label()} MB."
        )

    return content


def convert_blob_to_markdown(blob_url: str, filename: str) -> dict[str, Any]:
    extension = get_extension(filename)
    if extension not in ALLOWED_EXTENSIONS:
        raise ValueError(f"Extensión no permitida: {extension or '(vacía)'}")

    file_bytes = download_blob(blob_url)
    stream = io.BytesIO(file_bytes)
    markdown_text = ""

    if extension in {".xlsx", ".xls"}:
        try:
            markdown_text = convert_excel_bytes_to_markdown(file_bytes, extension)
        except Exception:
            markdown_text = ""

    if not markdown_text.strip():
        md = get_markitdown()
        stream.seek(0)
        result = md.convert_stream(
            stream,
            stream_info=StreamInfo(extension=extension, filename=filename),
        )
        markdown_text = result.markdown or result.text_content or ""

    if not markdown_text.strip() and extension == ".pdf":
        markdown_text = extract_pdf_fallback(file_bytes)

    if not markdown_text.strip():
        if extension == ".pdf":
            raise ValueError(
                "La conversión no produjo texto extraíble. Algunos PDFs corporativos "
                "(memorias, informes con diseño) guardan el texto de forma que MarkItDown "
                "no lo lee, aunque en el visor parezca seleccionable. Si el PDF es solo "
                "imagen escaneada, hace falta OCR. Prueba reexportar desde Word o "
                "'Guardar como PDF optimizado' en Acrobat."
            )
        raise ValueError("La conversión no produjo contenido.")

    upload_result = upload_markdown_to_blob(markdown_text, filename)
    output_name = os.path.splitext(os.path.basename(filename))[0] + ".md"

    return {
        "downloadUrl": upload_result.get("downloadUrl", ""),
        "downloadPath": upload_result.get("downloadPath", ""),
        "preview": markdown_text[:PREVIEW_CHAR_LIMIT],
        "filename": output_name,
        "charCount": len(markdown_text),
    }


def send_json(handler: BaseHTTPRequestHandler, status: int, payload: dict[str, Any]) -> None:
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Content-Length", str(len(body)))
    handler.end_headers()
    handler.wfile.write(body)


class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self) -> None:
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_POST(self) -> None:
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length <= 0 or length > 4096:
                send_json(self, 400, {"error": "Solicitud inválida."})
                return

            raw = self.rfile.read(length)
            data = json.loads(raw.decode("utf-8"))

            blob_url = data.get("blobUrl")
            filename = data.get("filename")
            size = data.get("size")

            if not isinstance(blob_url, str) or not isinstance(filename, str):
                send_json(self, 400, {"error": "blobUrl y filename son obligatorios."})
                return

            if isinstance(size, int) and size > max_file_size_bytes():
                send_json(
                    self,
                    400,
                    {
                        "error": f"El archivo supera el límite de {max_file_size_mb_label()} MB."
                    },
                )
                return

            result = convert_blob_to_markdown(blob_url, filename)
            send_json(self, 200, result)
        except UnsupportedFormatException as exc:
            send_json(self, 415, {"error": f"Formato no soportado: {exc}"})
        except MissingDependencyException as exc:
            send_json(
                self,
                501,
                {
                    "error": "Este formato requiere dependencias no disponibles en Vercel (p. ej. ffmpeg para audio)."
                },
            )
        except FileConversionException as exc:
            send_json(self, 422, {"error": f"No se pudo convertir el archivo: {exc}"})
        except ValueError as exc:
            send_json(self, 400, {"error": str(exc)})
        except requests.RequestException as exc:
            send_json(self, 502, {"error": f"Error de red al acceder al archivo: {exc}"})
        except Exception as exc:
            send_json(self, 500, {"error": f"Error interno: {exc}"})
