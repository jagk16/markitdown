"use client";

import { useCallback, useRef, useState } from "react";
import JSZip from "jszip";
import { MAX_FILE_SIZE_MB } from "@/lib/constants";
import {
  formatBytes,
  partFilename,
  splitPdfIntoParts,
  type PdfPart,
  type SplitPdfResult,
} from "@/lib/split-pdf";

const SPLIT_PART_OPTIONS = [2, 3, 4, 5] as const;
/** Límite local en el navegador (no pasa por el servidor). */
const MAX_SPLIT_MB = 120;

type Stage = "idle" | "processing" | "done" | "error";

export default function PdfSplitter() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [stage, setStage] = useState<Stage>("idle");
  const [partCount, setPartCount] = useState<(typeof SPLIT_PART_OPTIONS)[number]>(2);
  const [statusMessage, setStatusMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [result, setResult] = useState<SplitPdfResult | null>(null);

  const reset = useCallback(() => {
    setStage("idle");
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

      const maxBytes = MAX_SPLIT_MB * 1024 * 1024;
      if (file.size > maxBytes) {
        setStage("error");
        setStatusMessage(
          `El PDF supera ${MAX_SPLIT_MB} MB. Divídelo o comprímelo en tu PC antes.`,
        );
        return;
      }

      setSelectedFile(file);
      setResult(null);
      setStage("processing");
      setStatusMessage(`Dividiendo en ${partCount} partes…`);

      try {
        const split = await splitPdfIntoParts(file, partCount);
        setResult(split);
        setStage("done");
        setStatusMessage(
          `Listo: ${split.totalPages} páginas → ${split.parts.length} archivos.`,
        );
      } catch (error) {
        setStage("error");
        setStatusMessage(
          error instanceof Error ? error.message : "No se pudo dividir el PDF.",
        );
      }
    },
    [partCount],
  );

  const downloadPart = useCallback((part: PdfPart) => {
    if (!result) return;
    const name = partFilename(result.originalName, part, result.parts.length);
    const url = URL.createObjectURL(part.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }, [result]);

  const downloadZip = useCallback(async () => {
    if (!result) return;
    const zip = new JSZip();
    for (const part of result.parts) {
      const name = partFilename(result.originalName, part, result.parts.length);
      const buf = await part.blob.arrayBuffer();
      zip.file(name, buf);
    }
    const zipBlob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${result.originalName}-${result.parts.length}-partes.zip`;
    a.click();
    URL.revokeObjectURL(url);
  }, [result]);

  const busy = stage === "processing";

  return (
    <div className="splitter-panel">
      <p className="dropzone-hint" style={{ marginBottom: "1rem" }}>
        Divide un PDF grande en partes por páginas. Todo ocurre en tu navegador:
        el archivo <strong>no se sube</strong> al servidor. Útil si supera el límite
        de {MAX_FILE_SIZE_MB} MB para convertir a Markdown.
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
          Solo PDF · hasta {MAX_SPLIT_MB} MB en el navegador
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
        <summary>¿Cómo reducir el peso de un PDF con muchas imágenes?</summary>
        <ul>
          <li>
            <strong>Dividir</strong> ayuda a pasar el límite de subida, pero{" "}
            <em>no comprime</em> las imágenes: el peso total es similar.
          </li>
          <li>
            En Acrobat: Archivo → Reducir tamaño de archivo / Optimizar PDF.
          </li>
          <li>
            Herramientas online: iLovePDF, Smallpdf (comprimir PDF).
          </li>
          <li>
            En Windows: Imprimir → Microsoft Print to PDF con calidad media.
          </li>
          <li>
            Si son escaneos: bajar DPI al escanear (150 DPI suele bastar para
            texto).
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
                    {part.sizeBytes > MAX_FILE_SIZE_MB * 1024 * 1024 && (
                      <span className="status error"> · aún supera {MAX_FILE_SIZE_MB} MB</span>
                    )}
                  </span>
                </div>
                <button type="button" className="btn" onClick={() => downloadPart(part)}>
                  Descargar
                </button>
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
