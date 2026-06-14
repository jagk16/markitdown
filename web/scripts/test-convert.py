#!/usr/bin/env python3
"""Prueba local de conversión MarkItDown sin Vercel Blob."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser(description="Convertir un archivo local a Markdown.")
    parser.add_argument("input", type=Path, help="Ruta al archivo de entrada")
    parser.add_argument(
        "-o",
        "--output",
        type=Path,
        help="Ruta del .md de salida (default: stdout)",
    )
    args = parser.parse_args()

    if not args.input.is_file():
        print(f"Archivo no encontrado: {args.input}", file=sys.stderr)
        return 1

    try:
        from markitdown import MarkItDown, StreamInfo
    except ImportError:
        print(
            "Instala dependencias: pip install -r requirements.txt",
            file=sys.stderr,
        )
        return 1

    extension = args.input.suffix.lower()
    md = MarkItDown(enable_plugins=False)

    with args.input.open("rb") as stream:
        result = md.convert_stream(
            stream,
            stream_info=StreamInfo(
                extension=extension,
                filename=args.input.name,
            ),
        )

    markdown = result.markdown or result.text_content or ""

    if args.output:
        args.output.write_text(markdown, encoding="utf-8")
        print(f"Guardado: {args.output} ({len(markdown):,} caracteres)")
    else:
        print(markdown)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
