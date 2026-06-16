import io
import json
import os
import re
import uuid
from http.server import BaseHTTPRequestHandler
from typing import Any
from urllib.parse import urlparse

import requests
from pypdf import PdfReader, PdfWriter

BLOB_HOST_PATTERN = re.compile(
    r"^([a-z0-9-]+\.)?((public|private)\.)?blob\.vercel-storage\.com$",
    re.IGNORECASE,
)

BLOB_TTL_SECONDS = 3600


def max_split_file_size_bytes() -> int:
    return int(os.environ.get("MAX_SPLIT_FILE_MB", "120")) * 1024 * 1024


def get_blob_access() -> str:
    return os.environ.get("BLOB_ACCESS_MODE", "public").lower()


def is_allowed_blob_url(url: str) -> bool:
    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"}:
        return False
    hostname = parsed.hostname or ""
    return bool(BLOB_HOST_PATTERN.match(hostname))


def download_blob(url: str) -> bytes:
    if not is_allowed_blob_url(url):
        raise ValueError("Solo se permiten URLs de Vercel Blob del proyecto.")

    response = requests.get(url, timeout=180)
    response.raise_for_status()
    content = response.content

    if len(content) > max_split_file_size_bytes():
        raise ValueError(
            f"El PDF supera el límite de división ({os.environ.get('MAX_SPLIT_FILE_MB', '120')} MB)."
        )

    return content


def upload_pdf_bytes_to_blob(pdf_bytes: bytes, pathname: str) -> dict[str, Any]:
    token = os.environ.get("BLOB_READ_WRITE_TOKEN")
    if not token:
        raise ValueError("BLOB_READ_WRITE_TOKEN no configurado.")

    response = requests.put(
        f"https://blob.vercel-storage.com/{pathname}",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/pdf",
            "x-vercel-blob-access": get_blob_access(),
            "x-content-type": "application/pdf",
            "cache-control-max-age": str(BLOB_TTL_SECONDS),
        },
        data=pdf_bytes,
        timeout=180,
    )

    if response.status_code >= 400:
        try:
            detail = response.json().get("error", response.text)
        except Exception:
            detail = response.text[:500]
        raise ValueError(f"No se pudo guardar la parte en Blob: {detail}")

    payload = response.json()
    url = payload.get("downloadUrl") or payload.get("url", "")
    if url and "download=" not in url:
        sep = "&" if "?" in url else "?"
        url = f"{url}{sep}download=1"

    return {
        "downloadUrl": url,
        "downloadPath": payload.get("pathname", pathname),
        "sizeBytes": len(pdf_bytes),
    }


def safe_stem(filename: str) -> str:
    stem = os.path.splitext(os.path.basename(filename))[0] or "document"
    return re.sub(r"[^a-zA-Z0-9._-]", "-", stem)[:80]


def split_pdf_bytes(
    pdf_bytes: bytes, filename: str, part_count: int
) -> dict[str, Any]:
    if part_count < 2 or part_count > 10:
        raise ValueError("El número de partes debe estar entre 2 y 10.")

    reader = PdfReader(io.BytesIO(pdf_bytes))
    total_pages = len(reader.pages)

    if total_pages == 0:
        raise ValueError("El PDF no tiene páginas.")

    effective_parts = min(part_count, total_pages)
    pages_per_part = (total_pages + effective_parts - 1) // effective_parts
    stem = safe_stem(filename)
    parts: list[dict[str, Any]] = []

    for i in range(effective_parts):
        page_from = i * pages_per_part
        if page_from >= total_pages:
            break
        page_to = min(page_from + pages_per_part, total_pages) - 1

        writer = PdfWriter()
        for page_index in range(page_from, page_to + 1):
            writer.add_page(reader.pages[page_index])

        try:
            writer.compress_identical_objects(remove_identical=True)
        except TypeError:
            writer.compress_identical_objects()

        buffer = io.BytesIO()
        writer.write(buffer)
        part_bytes = buffer.getvalue()

        part_label = str(i + 1).zfill(len(str(effective_parts)))
        pathname = (
            f"outputs/{stem}-parte-{part_label}-p{page_from + 1}-{page_to + 1}-"
            f"{uuid.uuid4().hex[:8]}.pdf"
        )
        uploaded = upload_pdf_bytes_to_blob(part_bytes, pathname)

        parts.append(
            {
                "index": i + 1,
                "pageFrom": page_from + 1,
                "pageTo": page_to + 1,
                "downloadUrl": uploaded["downloadUrl"],
                "downloadPath": uploaded["downloadPath"],
                "sizeBytes": uploaded["sizeBytes"],
            }
        )

    return {
        "parts": parts,
        "totalPages": total_pages,
        "originalName": stem,
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
            part_count = data.get("partCount")
            size = data.get("size")

            if not isinstance(blob_url, str) or not isinstance(filename, str):
                send_json(self, 400, {"error": "blobUrl y filename son obligatorios."})
                return

            if not isinstance(part_count, int) or part_count < 2 or part_count > 10:
                send_json(self, 400, {"error": "partCount debe ser un entero entre 2 y 10."})
                return

            if isinstance(size, int) and size > max_split_file_size_bytes():
                send_json(
                    self,
                    400,
                    {
                        "error": f"El archivo supera {os.environ.get('MAX_SPLIT_FILE_MB', '120')} MB."
                    },
                )
                return

            pdf_bytes = download_blob(blob_url)
            result = split_pdf_bytes(pdf_bytes, filename, part_count)
            send_json(self, 200, result)
        except ValueError as exc:
            send_json(self, 400, {"error": str(exc)})
        except requests.RequestException as exc:
            send_json(self, 502, {"error": f"Error de red: {exc}"})
        except Exception as exc:
            send_json(self, 500, {"error": f"Error al dividir PDF: {exc}"})
