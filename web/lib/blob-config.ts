/** Configuración Vercel Blob con BLOB_READ_WRITE_TOKEN (modo clásico). */

export function getBlobStoreId(): string | undefined {
  return process.env.BLOB_STORE_ID;
}

export function getBlobReadWriteToken(): string | undefined {
  return process.env.BLOB_READ_WRITE_TOKEN;
}

export function hasBlobToken(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export function hasBlobStore(): boolean {
  return Boolean(process.env.BLOB_STORE_ID);
}

export function isBlobConfigured(): boolean {
  return hasBlobToken() && hasBlobStore();
}
