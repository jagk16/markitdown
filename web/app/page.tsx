import DropZone from "@/components/DropZone";
import DeployStatus from "@/components/DeployStatus";
import { MAX_FILE_SIZE_MB, SUPPORTED_ON_VERCEL } from "@/lib/constants";

export default function HomePage() {
  return (
    <main>
      <h1>MarkItDown Web</h1>
      <p className="subtitle">
        Convierte documentos a Markdown en línea. Ideal para PDF, Office y
        otros formatos compatibles con{" "}
        <a
          href="https://github.com/microsoft/markitdown"
          target="_blank"
          rel="noopener noreferrer"
        >
          Microsoft MarkItDown
        </a>
        .
      </p>

      <p className="notice">
        Uso público bajo tu responsabilidad. Archivos temporales (~1 h).
        Límite: {MAX_FILE_SIZE_MB} MB. PDFs muy grandes pueden agotar 5 min
        (Vercel Hobby). Blob store debe ser <strong>Public</strong> en Vercel.
      </p>

      <details className="formats-list">
        <summary>Formatos soportados en Vercel</summary>
        <ul>
          {SUPPORTED_ON_VERCEL.map((format) => (
            <li key={format}>{format}</li>
          ))}
        </ul>
        <p className="dropzone-hint">
          Audio (mp3/wav) no funciona en Vercel (falta ffmpeg).
        </p>
      </details>

      <DeployStatus />

      <DropZone />

      <footer>
        Powered by{" "}
        <a
          href="https://github.com/microsoft/markitdown"
          target="_blank"
          rel="noopener noreferrer"
        >
          MarkItDown
        </a>{" "}
        · Desplegado en Vercel
      </footer>
    </main>
  );
}
