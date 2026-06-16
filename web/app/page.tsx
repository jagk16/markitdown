import DeployStatus from "@/components/DeployStatus";
import ToolTabs from "@/components/ToolTabs";
import { MAX_FILE_SIZE_MB, SUPPORTED_ON_VERCEL } from "@/lib/constants";

export default function HomePage() {
  return (
    <main>
      <section className="hero">
        <h1>
          Convierte documentos a{" "}
          <span className="gradient-text">Markdown</span>
        </h1>
        <p className="subtitle">
          Sube PDF, Word, Excel y más. Obtén texto estructurado listo para LLMs,
          RAG y pipelines de datos. Basado en{" "}
          <a
            href="https://github.com/microsoft/markitdown"
            target="_blank"
            rel="noopener noreferrer"
          >
            Microsoft MarkItDown
          </a>
          .
        </p>
      </section>

      <div className="notice">
        <span className="notice-icon" aria-hidden>
          ℹ️
        </span>
        <div>
          Uso público bajo tu responsabilidad. Archivos temporales (~1 h).
          Límite: {MAX_FILE_SIZE_MB} MB. PDFs muy grandes pueden agotar 5 min
          (Vercel Hobby). Blob store debe ser <strong>Public</strong> en Vercel.
        </div>
      </div>

      <details className="formats-list">
        <summary>Formatos soportados en Vercel</summary>
        <ul>
          {SUPPORTED_ON_VERCEL.map((format) => (
            <li key={format}>{format}</li>
          ))}
        </ul>
        <p className="dropzone-hint" style={{ marginTop: "0.5rem" }}>
          Audio (mp3/wav) no funciona en Vercel (falta ffmpeg).
        </p>
      </details>

      <DeployStatus />

      <ToolTabs />

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
