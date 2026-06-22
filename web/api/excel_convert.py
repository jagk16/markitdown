"""Conversión de Excel a Markdown sin ruido (NaN, columnas vacías, tablas múltiples)."""

from __future__ import annotations

import io
import re
from typing import Any

import pandas as pd


def _format_cell(value: Any) -> str:
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return ""
    if isinstance(value, float) and value == int(value):
        return str(int(value))
    text = str(value).strip()
    if text.lower() in {"nan", "none", "<na>"}:
        return ""
    return text


def _row_is_empty(values: Any) -> bool:
    return all(not _format_cell(v) for v in values)


def _escape_md_cell(text: str) -> str:
    return text.replace("|", "\\|").replace("\n", " ")


def _trim_empty_columns(block: pd.DataFrame) -> pd.DataFrame:
    if block.empty:
        return block
    keep = [col for col in block.columns if not _row_is_empty(block[col].values)]
    return block.loc[:, keep]


def _split_sheet_blocks(df: pd.DataFrame) -> list[pd.DataFrame]:
    blocks: list[pd.DataFrame] = []
    row_indices: list[int] = []

    for index in range(len(df)):
        row = df.iloc[index]
        if _row_is_empty(row.values):
            if row_indices:
                blocks.append(df.iloc[row_indices].copy())
                row_indices = []
            continue
        row_indices.append(index)

    if row_indices:
        blocks.append(df.iloc[row_indices].copy())

    return blocks


def _block_to_markdown(block: pd.DataFrame) -> str:
    rows: list[list[str]] = []
    for _, row in block.iterrows():
        cells = [_format_cell(v) for v in row.values]
        while cells and not cells[-1]:
            cells.pop()
        if any(cells):
            rows.append(cells)

    if not rows:
        return ""

    max_cols = max(len(r) for r in rows)
    normalized = [r + [""] * (max_cols - len(r)) for r in rows]

    lines = [
        "| " + " | ".join(_escape_md_cell(c) for c in normalized[0]) + " |",
        "| " + " | ".join("---" for _ in range(max_cols)) + " |",
    ]
    for row in normalized[1:]:
        lines.append("| " + " | ".join(_escape_md_cell(c) for c in row) + " |")

    return "\n".join(lines)


def _sheet_name_heading(name: str) -> str:
    safe = re.sub(r"\s+", " ", str(name).strip())
    return f"## {safe}" if safe else "## Hoja"


def convert_excel_bytes_to_markdown(data: bytes, extension: str) -> str:
    engine = "openpyxl" if extension == ".xlsx" else "xlrd"
    sheets = pd.read_excel(io.BytesIO(data), sheet_name=None, header=None, engine=engine)

    parts: list[str] = []
    for sheet_name, raw_df in sheets.items():
        if raw_df.empty:
            continue

        blocks = _split_sheet_blocks(raw_df)
        sheet_parts: list[str] = []

        for block in blocks:
            block = _trim_empty_columns(block.reset_index(drop=True))
            table = _block_to_markdown(block)
            if table:
                sheet_parts.append(table)

        if sheet_parts:
            parts.append(_sheet_name_heading(sheet_name))
            parts.extend(sheet_parts)

    return "\n\n".join(parts).strip()
