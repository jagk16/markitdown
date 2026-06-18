"use client";

import { useCallback, useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import JSZip from "jszip";
import {
  ALLOWED_EXTENSIONS,
  FORMAT_LABEL,
  MAX_BATCH_FILES,
} from "@/lib/constants";
import { sanitizeUploadPath } from "@/lib/upload-path";

type Stage = "idle" | "processing" | "done";

type ConvertResult = {
  downloadUrl: string;
  preview: string;
  filename: string;
  charCount: number;
  downloadPath?: string;
};

type FileJobStatus = "pending" | "uploading" | "converting" | "done" | "error";

type FileJob = {
  id: string;
  file: File;
  status: FileJobStatus;
  error?: string;
  result?: ConvertResult;
};

function getExtension(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot >= 0 ? filename.slice(dot).toLowerCase() : "";
}

function validateFile(file: File, maxFileSizeMb: number): string | null {
  const maxBytes = maxFileSizeMb * 1024 * 1024;
  if (file.size > maxBytes) {
    return `Supera el límite de ${maxFileSizeMb} MB.`;
  }

  const ext = getExtension(file.name);
  if (!ALLOWED_EXTENSIONS.includes(ext as (typeof ALLOWED_EXTENSIONS)[number])) {
    return `Formato no permitido (${ext || "sin extensión"}).`;
  }

  return null;
}

function jobStatusLabel(status: FileJobStatus): string {
  switch (status) {
    case "pending":
      return "En cola";
    case "uploading":
      return "Subiendo…";
    case "converting":
      return "Convirtiendo…";
    case "done":
      return "Listo";
    case "error":
      return "Error";
  }
}

type DropZoneProps = {
  maxFileSizeMb: number;
};

export default function DropZone({ maxFileSizeMb }: DropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [stage, setStage] = useState<Stage>("idle");
  const [overallProgress, setOverallProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const [jobs, setJobs] = useState<FileJob[]>([]);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  const reset = useCallback(() => {
    setStage("idle");
    setOverallProgress(0);
    setStatusMessage("");
    setJobs([]);
    setActiveJobId(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }, []);

  const updateJob = useCallback((id: string, patch: Partial<FileJob>) => {
    setJobs((prev) => prev.map((job) => (job.id === id ? { ...job, ...patch } : job)));
  }, []);

  const processFiles = useCallback(
    async (rawFiles: File[]) => {
      const files = Array.from(rawFiles);
      if (files.length === 0) return;

      if (files.length > MAX_BATCH_FILES) {
        setStage("done");
        setStatusMessage(
          `Máximo ${MAX_BATCH_FILES} archivos por lote. Selecciona menos archivos.`,
        );
        return;
      }

      const initialJobs: FileJob[] = files.map((file, index) => {
        const validationError = validateFile(file, maxFileSizeMb);
        return {
          id: `${Date.now()}-${index}-${file.name}`,
          file,
          status: validationError ? "error" : "pending",
          error: validationError ?? undefined,
        };
      });

      const runnable = initialJobs.filter((job) => job.status === "pending");
      if (runnable.length === 0) {
        setJobs(initialJobs);
        setStage("done");
        setStatusMessage("Ningún archivo válido para convertir.");
        return;
      }

      setJobs(initialJobs);
      setStage("processing");
      setOverallProgress(0);
      setStatusMessage(
        files.length === 1
          ? `Procesando ${files[0].name}…`
          : `Procesando ${runnable.length} archivo(s)…`,
      );

      let completed = 0;
      let succeeded = 0;
      let failed = initialJobs.length - runnable.length;
      const total = runnable.length;

      for (const job of initialJobs) {
        if (job.status !== "pending") {
          continue;
        }

        setActiveJobId(job.id);
        updateJob(job.id, { status: "uploading" });

        try {
          const result = await (async () => {
            const blob = await upload(sanitizeUploadPath(job.file.name), job.file, {
              access: "public",
              handleUploadUrl: "/api/upload",
            });

            updateJob(job.id, { status: "converting" });

            const response = await fetch("/api/convert", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                blobUrl: blob.url,
                filename: job.file.name,
                size: job.file.size,
              }),
            });

            let data: ConvertResult & { error?: string };
            try {
              data = (await response.json()) as ConvertResult & { error?: string };
            } catch {
              if (response.status === 504) {
                throw new Error("Timeout (5 min). Archivo muy grande o muchas páginas.");
              }
              throw new Error("Respuesta inválida del servidor.");
            }

            if (!response.ok) {
              if (response.status === 504) {
                throw new Error("Timeout (5 min). Archivo muy grande o muchas páginas.");
              }
              throw new Error(data.error ?? "Error al convertir.");
            }

            return data;
          })();

          updateJob(job.id, { status: "done", result });
          succeeded += 1;
        } catch (error) {
          updateJob(job.id, {
            status: "error",
            error: error instanceof Error ? error.message : "Error inesperado.",
          });
          failed += 1;
        }

        completed += 1;
        setOverallProgress(Math.round((completed / total) * 100));
        setStatusMessage(
          total === 1
            ? "Procesando…"
            : `Completados ${completed} de ${total}…`,
        );
      }

      setActiveJobId(null);
      setStage("done");

      if (succeeded === 0) {
        setStatusMessage("No se pudo convertir ningún archivo.");
      } else if (failed === 0) {
        setStatusMessage(
          succeeded === 1
            ? "Conversión completada."
            : `${succeeded} archivos convertidos.`,
        );
      } else {
        setStatusMessage(`${succeeded} convertidos, ${failed} con error.`);
      }
    },
    [maxFileSizeMb, updateJob],
  );

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setDragging(false);
      const files = Array.from(event.dataTransfer.files);
      if (files.length > 0) {
        void processFiles(files);
      }
    },
    [processFiles],
  );

  const onFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files ?? []);
      if (files.length > 0) {
        void processFiles(files);
      }
    },
    [processFiles],
  );

  const downloadZip = useCallback(async () => {
    const done = jobs.filter((j) => j.status === "done" && j.result);
    if (done.length === 0) return;

    const zip = new JSZip();
    for (const job of done) {
      const res = await fetch(job.result!.downloadUrl);
      if (!res.ok) {
        throw new Error(`No se pudo descargar ${job.file.name}`);
      }
      zip.file(job.result!.filename, await res.text());
    }

    const zipBlob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `markdown-${done.length}-archivos.zip`;
    a.click();
    URL.revokeObjectURL(url);
  }, [jobs]);

  const busy = stage === "processing";
  const doneJobs = jobs.filter((j) => j.status === "done" && j.result);
  const singleResult = doneJobs.length === 1 ? doneJobs[0].result! : null;

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
          ☁
        </div>
        <p className="dropzone-title">Arrastra tus archivos aquí</p>
        <p className="dropzone-hint">
          {FORMAT_LABEL} · máximo {maxFileSizeMb} MB por archivo · hasta{" "}
          {MAX_BATCH_FILES} a la vez
        </p>
        <label className="file-input-label">
          Elegir archivos
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={ALLOWED_EXTENSIONS.join(",")}
            disabled={busy}
            onChange={onFileChange}
          />
        </label>
      </div>

      {(busy || stage === "done") && jobs.length > 0 && (
        <section className="progress-section" aria-live="polite">
          {busy && (
            <>
              <div className="progress-label">
                <span>Progreso del lote</span>
                <span>{overallProgress}%</span>
              </div>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${overallProgress}%` }}
                />
              </div>
            </>
          )}

          {statusMessage && (
            <p
              className={`status${
                stage === "done" && doneJobs.length === 0 ? " error" : " success"
              }`}
              style={{ marginTop: busy ? "0.75rem" : 0 }}
            >
              {statusMessage}
            </p>
          )}

          <ul className="parts-list batch-jobs-list">
            {jobs.map((job) => (
              <li
                key={job.id}
                className={`parts-list-item batch-job-item${
                  job.id === activeJobId ? " active" : ""
                }`}
              >
                <div className="batch-job-info">
                  <strong>{job.file.name}</strong>
                  <span className="dropzone-hint">
                    {" "}
                    ·{" "}
                    <span
                      className={
                        job.status === "error"
                          ? "status error"
                          : job.status === "done"
                            ? "status success"
                            : ""
                      }
                    >
                      {job.error ?? jobStatusLabel(job.status)}
                      {job.result
                        ? ` · ${job.result.charCount.toLocaleString()} caracteres`
                        : ""}
                    </span>
                  </span>
                </div>
                {job.result && (
                  <a
                    className="btn btn-primary"
                    href={job.result.downloadUrl}
                    download={job.result.filename}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    .md
                  </a>
                )}
              </li>
            ))}
          </ul>

          {stage === "done" && (
            <div className="actions" style={{ marginTop: "0.75rem" }}>
              {doneJobs.length > 1 && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => void downloadZip().catch(() => {
                    setStatusMessage("No se pudo generar el ZIP.");
                  })}
                >
                  Descargar todos (.zip)
                </button>
              )}
              <button type="button" className="btn" onClick={reset}>
                Convertir más archivos
              </button>
            </div>
          )}
        </section>
      )}

      {singleResult && (
        <section className="result-section">
          <div className="result-header">
            <h2>
              Vista previa ({singleResult.charCount.toLocaleString()} caracteres)
            </h2>
            <div className="actions">
              <a
                className="btn btn-primary"
                href={singleResult.downloadUrl}
                download={singleResult.filename}
                target="_blank"
                rel="noopener noreferrer"
              >
                Descargar .md
              </a>
              <button
                type="button"
                className="btn"
                onClick={() => navigator.clipboard.writeText(singleResult.preview)}
              >
                Copiar vista previa
              </button>
            </div>
          </div>
          <pre className="preview">{singleResult.preview}</pre>
        </section>
      )}
    </>
  );
}
