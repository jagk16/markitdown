/** public = URLs accesibles con el enlace (recomendado para esta app temporal). */
/** private = más seguro; requiere token del servidor para descargar. */
export type BlobAccess = "public" | "private";

export function getBlobAccess(): BlobAccess {
  return "public";
}

export function hasBlobToken(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export function hasBlobStore(): boolean {
  return Boolean(process.env.BLOB_STORE_ID || process.env.BLOB_READ_WRITE_TOKEN);
}
