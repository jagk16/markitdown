"use client";

import { useCallback, useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import JSZip from "jszip";
import { sanitizeUploadPath } from "@/lib/upload-path";
import {
  formatBytes,
  partFilename,
  type PdfPart,
  type SplitPdfResult,
} from "@/lib/split-pdf";

const SPLIT_PART_OPTIONS = [2, 3, 4, 5, 6, 8, 10] as const;

type Stage = "idle" | "uploading" | "splitting" | "done" | "error";

type PdfSplitterProps = {
  maxFileSizeMb: number;
  maxSplitFileMb: number;
};

export default function PdfSplitter({
  maxFileSizeMb,
  maxSplitFileMb,
}: PdfSplitterProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [stage, setStage] = useState<Stage>("idle");
  const [progress, setProgress] = useState(0);
  const [partCount, setPartCount] = useState<(typeof SPLIT_PART_OPTIONS)[number]>(5);
  const [statusMessage, setStatusMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [result, setResult] = useState<SplitPdfResult | null>(null);

  const reset = useCallback(() => {
    setStage("idle");
    setProgress(0);
    setStatusMessage("");
    setResult(null);
    setSelectedFile(null);
    if (inputRef.current) inputRef.current.value = "";
  }, []);

  const processFile = useCallback(
    async (file: File) => {
      if (!file.name.toLowerCase().endsWith(".pdf")) {
        setStage("error");
        setStatusMessage("Solo se admiten archivos PDF.");
        return;
      }

      const maxBytes = maxSplitFileMb * 1024 * 1024;
      if (file.size > maxBytes) {
        setStage("error");
        setStatusMessage(
          `El PDF supera ${maxSplitFileMb} MB. Comprímelo en tu PC antes.`,
        );
        return;
      }

      setSelectedFile(file);
      setResult(null);
      setStage("uploading");
      setProgress(5);
      setStatusMessage(`Subiendo ${file.name}…`);

      try {
        const blob = await upload(sanitizeUploadPath(file.name), file, {
          access: "public",
          handleUploadUrl: "/api/upload-split",
          onUploadProgress: ({ percentage }) => {
            setProgress(Math.max(5, Math.min(45, Math.round(percentage))));
          },
        });

        setStage("splitting");
        setProgress(55);
        setStatusMessage(`Dividiendo en ${partCount} partes (solo páginas de cada tramo)…`);

        const response = await fetch("/api/split_pdf", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            blobUrl: blob.url,
            filename: file.name,
            partCount,
            size: file.size,
          }),
        });

        const data = (await response.json()) as SplitPdfResult & { error?: string };
        if (!response.ok) {
          throw new Error(data.error ?? "Error al dividir el PDF.");
        }

        setResult(data);
        setProgress(100);
        setStage("done");
        setStatusMessage(
          `Listo: ${data.totalPages} páginas → ${data.parts.length} archivos.`,
        );
      } catch (error) {
        setStage("error");
        setProgress(0);
        setStatusMessage(
          error instanceof Error ? error.message : "No se pudo dividir el PDF.",
        );
      }
    },
    [partCount, maxSplitFileMb],
  );

  const downloadZip = useCallback(async () => {
    if (!result) return;
    const zip = new JSZip();
    for (const part of result.parts) {
      const name = partFilename(result.originalName, part, result.parts.length);
      const res = await fetch(part.downloadUrl);
      if (!res.ok) throw new Error(`No se pudo descargar ${name}`);
      zip.file(name, await res.arrayBuffer());
    }
    const zipBlob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${result.originalName}-${result.parts.length}-partes.zip`;
    a.click();
    URL.revokeObjectURL(url);
  }, [result]);

  const busy = stage === "uploading" || stage === "splitting";

  return (
    <div className="splitter-panel">
      <p className="dropzone-hint" style={{ marginBottom: "1rem" }}>
        Sube el PDF y el servidor lo divide <strong>por páginas</strong>, guardando
        solo el contenido de cada tramo (no duplica todo el archivo). Límite de
        subida: {maxSplitFileMb} MB. Cada parte debe quedar bajo{" "}
        {maxFileSizeMb} MB para convertir a Markdown.
      </p>

      <div className="part-selector" role="group" aria-label="Número de partes">
        <span className="part-selector-label">Partes iguales:</span>
        {SPLIT_PART_OPTIONS.map((n) => (
          <button
            key={n}
            type="button"
            className={`part-btn${partCount === n ? " active" : ""}`}
            disabled={busy}
            onClick={() => setPartCount(n)}
          >
            {n}
          </button>
        ))}
      </div>

      <div
        className={`dropzone${dragging ? " dragging" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files[0];
          if (file) void processFile(file);
        }}
      >
        <div className="dropzone-icon" aria-hidden>
          ✂
        </div>
        <p className="dropzone-title">Arrastra tu PDF aquí</p>
        <p className="dropzone-hint">
          Solo PDF · hasta {maxSplitFileMb} MB
        </p>
        <label className="file-input-label">
          Elegir PDF
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,application/pdf"
            disabled={busy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void processFile(file);
            }}
          />
        </label>
      </div>

      <details className="formats-list" style={{ marginTop: "1rem" }}>
        <summary>Si las partes siguen siendo muy pesadas</summary>
        <ul>
          <li>
            Prueba <strong>más partes</strong> (8 o 10) si el PDF tiene muchas
            páginas con imágenes.
          </li>
          <li>
            <strong>Comprimir</strong> antes de dividir: iLovePDF, Smallpdf o
            Acrobat → Reducir tamaño.
          </li>
          <li>
            PDFs escaneados a 300 DPI: reescanear a 150 DPI reduce mucho el peso.
          </li>
        </ul>
      </details>

      {(busy || stage === "done" || stage === "error") && (
        <section className="progress-section" aria-live="polite">
          {selectedFile && (
            <p className="dropzone-hint" style={{ marginBottom: "0.75rem" }}>
              Archivo: <strong>{selectedFile.name}</strong> (
              {formatBytes(selectedFile.size)})
            </p>
          )}
          {busy && (
            <>
              <div className="progress-label">
                <span>{stage === "uploading" ? "Subiendo" : "Dividiendo"}</span>
                <span>{progress}%</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${progress}%` }} />
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
            <button type="button" className="btn" style={{ marginTop: "0.75rem" }} onClick={reset}>
              Dividir otro PDF
            </button>
          )}
        </section>
      )}

      {result && result.parts.length > 0 && (
        <section className="result-section">
          <div className="result-header">
            <h2>
              {result.parts.length} partes · {result.totalPages} páginas
            </h2>
            <div className="actions">
              <button type="button" className="btn btn-primary" onClick={() => void downloadZip()}>
                Descargar ZIP
              </button>
            </div>
          </div>
          <ul className="parts-list">
            {result.parts.map((part) => (
              <li key={part.index} className="parts-list-item">
                <div>
                  <strong>Parte {part.index}</strong>
                  <span className="dropzone-hint">
                    {" "}
                    · páginas {part.pageFrom}–{part.pageTo} · {formatBytes(part.sizeBytes)}
                    {part.sizeBytes > maxFileSizeMb * 1024 * 1024 && (
                      <span className="status error"> · aún supera {maxFileSizeMb} MB</span>
                    )}
                  </span>
                </div>
                <a
                  className="btn"
                  href={part.downloadUrl}
                  download={partFilename(result.originalName, part, result.parts.length)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Descargar
                </a>
              </li>
            ))}
          </ul>
          <p className="dropzone-hint" style={{ padding: "0.75rem 1.25rem 1rem" }}>
            Luego sube cada parte en la pestaña <strong>Convertir</strong> para obtener
            el Markdown.
          </p>
        </section>
      )}
    </div>
  );
}
