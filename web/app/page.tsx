import ToolTabs from "@/components/ToolTabs";
import {
  getServerMaxFileSizeMb,
  getServerMaxSplitFileSizeMb,
} from "@/lib/file-limits";
import { SUPPORTED_ON_VERCEL } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const maxFileSizeMb = getServerMaxFileSizeMb();
  const maxSplitFileMb = getServerMaxSplitFileSizeMb();

  return (
    <main>
      <section className="hero">
        <h1>
          Convierte documentos a{" "}
          <span className="gradient-text">Markdown</span>
        </h1>
        <p className="subtitle">
          Sube PDF, Word, Excel y más. Obtén texto listo para LLMs y RAG. Basado en{" "}
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

      <section className="tools-section card">
        <ToolTabs
          maxFileSizeMb={maxFileSizeMb}
          maxSplitFileMb={maxSplitFileMb}
        />
      </section>

      <p className="notice-short">
        Uso público · archivos temporales (~1 h) · límite {maxFileSizeMb} MB por
        archivo
      </p>

      <details className="formats-list">
        <summary>Formatos soportados</summary>
        <ul>
          {SUPPORTED_ON_VERCEL.map((format) => (
            <li key={format}>{format}</li>
          ))}
        </ul>
        <p className="dropzone-hint" style={{ marginTop: "0.5rem" }}>
          Audio (mp3/wav) no funciona en Vercel (falta ffmpeg).
        </p>
      </details>

      <footer>
        Powered by{" "}
        <a
          href="https://github.com/microsoft/markitdown"
          target="_blank"
          rel="noopener noreferrer"
        >
          MarkItDown
        </a>
      </footer>
    </main>
  );
}
