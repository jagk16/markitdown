export const MAX_FILE_SIZE_MB = Number(process.env.MAX_FILE_SIZE_MB ?? "25");
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
export const PREVIEW_CHAR_LIMIT = 50_000;
export const BLOB_TTL_SECONDS = 3600;

export const ALLOWED_EXTENSIONS = [
  ".pdf",
  ".docx",
  ".pptx",
  ".xlsx",
  ".xls",
  ".html",
  ".htm",
  ".csv",
  ".json",
  ".xml",
  ".epub",
  ".ipynb",
  ".zip",
  ".msg",
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".wav",
  ".mp3",
  ".m4a",
  ".txt",
  ".md",
  ".rtf",
] as const;

export const ALLOWED_CONTENT_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "text/html",
  "text/csv",
  "application/json",
  "application/xml",
  "text/xml",
  "application/epub+zip",
  "application/x-ipynb+json",
  "application/zip",
  "application/vnd.ms-outlook",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "audio/wav",
  "audio/mpeg",
  "audio/mp4",
  "text/plain",
  "text/markdown",
  "application/rtf",
  "application/octet-stream",
] as const;

export const FORMAT_LABEL =
  "PDF, Word, Excel, PowerPoint, HTML, CSV, EPUB, imágenes y más";
