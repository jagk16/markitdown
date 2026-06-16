/** Límite visible en UI (cliente). Definir NEXT_PUBLIC_MAX_FILE_SIZE_MB en Vercel y redeploy. */
export const MAX_FILE_SIZE_MB =
  Number(process.env.NEXT_PUBLIC_MAX_FILE_SIZE_MB ?? "25") || 25;

export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

/** Límite en rutas API Node (runtime). Usa MAX_FILE_SIZE_MB o NEXT_PUBLIC_MAX_FILE_SIZE_MB. */
export function getServerMaxFileSizeBytes(): number {
  const raw =
    process.env.MAX_FILE_SIZE_MB ??
    process.env.NEXT_PUBLIC_MAX_FILE_SIZE_MB ??
    "25";
  const mb = Number(raw);
  return (Number.isFinite(mb) && mb > 0 ? mb : 25) * 1024 * 1024;
}

export function getServerMaxFileSizeMb(): number {
  return getServerMaxFileSizeBytes() / (1024 * 1024);
}
