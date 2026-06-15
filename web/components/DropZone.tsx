"use client";

import { useCallback, useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import {
  ALLOWED_EXTENSIONS,
  FORMAT_LABEL,
  MAX_FILE_SIZE_BYTES,
  MAX_FILE_SIZE_MB,
} from "@/lib/constants";
import { sanitizeUploadPath } from "@/lib/upload-path";

/** Store público en Vercel + @vercel/blob 0.27 requieren access public. */
const BLOB_ACCESS = "public" as const;

type Stage = "idle" | "uploading" | "converting" | "done" | "error";

type ConvertResult = {
  downloadUrl: string;
  preview: string;
  filename: string;
  charCount: number;
  downloadPath?: string;
};

function getExtension(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot >= 0 ? filename.slice(dot).toLowerCase() : "";
}

function validateFile(file: File): string | null {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return `El archivo supera el límite de ${MAX_FILE_SIZE_MB} MB.`;
  }

  const ext = getExtension(file.name);
  if (!ALLOWED_EXTENSIONS.includes(ext as (typeof ALLOWED_EXTENSIONS)[number])) {
    return `Formato no permitido (${ext || "sin extensión"}).`;
  }

  return null;
}

export default function DropZone() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [stage, setStage] = useState<Stage>("idle");
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const [result, setResult] = useState<ConvertResult | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const reset = useCallback(() => {
    setStage("idle");
    setProgress(0);
    setStatusMessage("");
    setResult(null);
    setSelectedFile(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }, []);

  const processFile = useCallback(async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setStage("error");
      setStatusMessage(validationError);
      return;
    }

    setSelectedFile(file);
    setResult(null);
    setStage("uploading");
    setProgress(10);
    setStatusMessage(`Subiendo ${file.name}…`);

    try {
      const blob = await upload(sanitizeUploadPath(file.name), file, {
        access: BLOB_ACCESS,
        handleUploadUrl: "/api/upload",
        onUploadProgress: ({ percentage }) => {
          setProgress(Math.max(10, Math.min(55, Math.round(percentage))));
        },
      });

      setStage("converting");
      setProgress(60);
      setStatusMessage("Convirtiendo a Markdown…");

      const response = await fetch("/api/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          blobUrl: blob.url,
          filename: file.name,
          size: file.size,
        }),
      });

      let data: ConvertResult & { error?: string };
      try {
        data = (await response.json()) as ConvertResult & { error?: string };
      } catch {
        if (response.status === 504) {
          throw new Error(
            "La conversión tardó demasiado (timeout de 5 min en Vercel Hobby). Prueba con un PDF más pequeño o usa Vercel Pro.",
          );
        }
        throw new Error("Respuesta inválida del servidor de conversión.");
      }

      if (!response.ok) {
        if (response.status === 504) {
          throw new Error(
            "La conversión tardó demasiado (timeout de 5 min en Vercel Hobby). Prueba con un PDF más pequeño o usa Vercel Pro.",
          );
        }
        throw new Error(data.error ?? "Error al convertir el archivo.");
      }

      setProgress(100);
      setStage("done");
      setStatusMessage("Conversión completada.");
      setResult(data);
    } catch (error) {
      setStage("error");
      setProgress(0);
      setStatusMessage(
        error instanceof Error ? error.message : "Ocurrió un error inesperado.",
      );
    }
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setDragging(false);
      const file = event.dataTransfer.files[0];
      if (file) {
        void processFile(file);
      }
    },
    [processFile],
  );

  const onFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        void processFile(file);
      }
    },
    [processFile],
  );

  const busy = stage === "uploading" || stage === "converting";

  return (
    <>
      <div
        className={`dropzone${dragging ? " dragging" : ""}`}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <div className="dropzone-icon" aria-hidden>
          📄
        </div>
        <p className="dropzone-title">Arrastra tu archivo aquí</p>
        <p className="dropzone-hint">
          {FORMAT_LABEL} · máximo {MAX_FILE_SIZE_MB} MB
        </p>
        <label className="file-input-label">
          Elegir archivo
          <input
            ref={inputRef}
            type="file"
            accept={ALLOWED_EXTENSIONS.join(",")}
            disabled={busy}
            onChange={onFileChange}
          />
        </label>
      </div>

      {(busy || stage === "done" || stage === "error") && (
        <section className="progress-section" aria-live="polite">
          {selectedFile && (
            <p className="dropzone-hint" style={{ marginBottom: "0.75rem" }}>
              Archivo: <strong>{selectedFile.name}</strong>
            </p>
          )}
          {busy && (
            <>
              <div className="progress-label">
                <span>
                  {stage === "uploading" ? "Subiendo" : "Convirtiendo"}
                </span>
                <span>{progress}%</span>
              </div>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </>
          )}
          {statusMessage && (
            <p
              className={`status${stage === "error" ? " error" : stage === "done" ? " success" : ""}`}
            >
              {statusMessage}
            </p>
          )}
          {(stage === "done" || stage === "error") && (
            <button
              type="button"
              className="btn"
              style={{ marginTop: "0.75rem" }}
              onClick={reset}
            >
              Convertir otro archivo
            </button>
          )}
        </section>
      )}

      {result && (
        <section className="result-section">
          <div className="result-header">
            <h2>Vista previa ({result.charCount.toLocaleString()} caracteres)</h2>
            <div className="actions">
              <a
                className="btn btn-primary"
                href={
                  result.downloadPath
                    ? `/api/download?pathname=${encodeURIComponent(result.downloadPath)}`
                    : result.downloadUrl
                }
                download={result.filename}
                target="_blank"
                rel="noopener noreferrer"
              >
                Descargar .md
              </a>
              <button
                type="button"
                className="btn"
                onClick={() => navigator.clipboard.writeText(result.preview)}
              >
                Copiar vista previa
              </button>
            </div>
          </div>
          <pre className="preview">{result.preview}</pre>
        </section>
      )}
    </>
  );
}
