import { PDFDocument } from "pdf-lib";

export type PdfPart = {
  index: number;
  pageFrom: number;
  pageTo: number;
  blob: Blob;
  sizeBytes: number;
};

export type SplitPdfResult = {
  parts: PdfPart[];
  totalPages: number;
  originalName: string;
};

function baseName(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot >= 0 ? filename.slice(0, dot) : filename;
}

function bytesToPdfBlob(bytes: Uint8Array): Blob {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return new Blob([buffer], { type: "application/pdf" });
}

/** Divide un PDF en N partes con rangos de páginas lo más iguales posible. */
export async function splitPdfIntoParts(
  file: File,
  partCount: number,
): Promise<SplitPdfResult> {
  if (partCount < 2 || partCount > 10) {
    throw new Error("El número de partes debe estar entre 2 y 10.");
  }

  const bytes = await file.arrayBuffer();
  const source = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const totalPages = source.getPageCount();

  if (totalPages === 0) {
    throw new Error("El PDF no tiene páginas.");
  }

  const effectiveParts = Math.min(partCount, totalPages);
  const pagesPerPart = Math.ceil(totalPages / effectiveParts);
  const stem = baseName(file.name);
  const parts: PdfPart[] = [];

  for (let i = 0; i < effectiveParts; i++) {
    const pageFrom = i * pagesPerPart;
    if (pageFrom >= totalPages) break;

    const pageTo = Math.min(pageFrom + pagesPerPart, totalPages) - 1;
    const indices = Array.from(
      { length: pageTo - pageFrom + 1 },
      (_, j) => pageFrom + j,
    );

    const partDoc = await PDFDocument.create();
    const copied = await partDoc.copyPages(source, indices);
    for (const page of copied) {
      partDoc.addPage(page);
    }

    const partBytes = await partDoc.save();
    const blob = bytesToPdfBlob(partBytes);

    parts.push({
      index: i + 1,
      pageFrom: pageFrom + 1,
      pageTo: pageTo + 1,
      blob,
      sizeBytes: blob.size,
    });
  }

  return {
    parts,
    totalPages,
    originalName: stem,
  };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function partFilename(stem: string, part: PdfPart, totalParts: number): string {
  const pad = String(totalParts).length;
  const n = String(part.index).padStart(pad, "0");
  return `${stem}-parte-${n}-p${part.pageFrom}-${part.pageTo}.pdf`;
}
