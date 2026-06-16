/** Valor por defecto si no hay variables de entorno (solo referencia). */
export const DEFAULT_MAX_FILE_SIZE_MB = 25;

/** @deprecated En UI usar props desde el servidor o getServerMaxFileSizeMb(). */
export const MAX_FILE_SIZE_MB =
  Number(process.env.NEXT_PUBLIC_MAX_FILE_SIZE_MB ?? String(DEFAULT_MAX_FILE_SIZE_MB)) ||
  DEFAULT_MAX_FILE_SIZE_MB;

export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

function parseMb(raw: string | undefined, fallback: number): number {
  const mb = Number(raw);
  return Number.isFinite(mb) && mb > 0 ? mb : fallback;
}

/** Límite en servidor (runtime). Basta con MAX_FILE_SIZE_MB en Vercel + redeploy. */
export function getServerMaxFileSizeBytes(): number {
  const raw =
    process.env.MAX_FILE_SIZE_MB ??
    process.env.NEXT_PUBLIC_MAX_FILE_SIZE_MB ??
    String(DEFAULT_MAX_FILE_SIZE_MB);
  return parseMb(raw, DEFAULT_MAX_FILE_SIZE_MB) * 1024 * 1024;
}

export function getServerMaxFileSizeMb(): number {
  return getServerMaxFileSizeBytes() / (1024 * 1024);
}

export function getServerMaxSplitFileSizeMb(): number {
  return parseMb(process.env.MAX_SPLIT_FILE_MB, 120);
}

