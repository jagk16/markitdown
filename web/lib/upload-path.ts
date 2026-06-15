/** Sanitiza el nombre de archivo para rutas en Vercel Blob (sin espacios ni caracteres raros). */
export function sanitizeUploadPath(filename: string): string {
  const dot = filename.lastIndexOf(".");
  const ext = dot >= 0 ? filename.slice(dot).toLowerCase() : "";
  const stem = (dot >= 0 ? filename.slice(0, dot) : filename)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);

  return `uploads/${stem || "file"}${ext}`;
}
