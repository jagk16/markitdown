export type PdfPart = {
  index: number;
  pageFrom: number;
  pageTo: number;
  downloadUrl: string;
  sizeBytes: number;
};

export type SplitPdfResult = {
  parts: PdfPart[];
  totalPages: number;
  originalName: string;
};

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
