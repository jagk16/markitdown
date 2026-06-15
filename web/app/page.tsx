import DropZone from "@/components/DropZone";
import DeployStatus from "@/components/DeployStatus";
import { MAX_FILE_SIZE_MB } from "@/lib/constants";

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
        Uso público bajo tu responsabilidad. Los archivos se procesan de forma
        temporal (hasta 1 hora). Límite: {MAX_FILE_SIZE_MB} MB por archivo.
        PDFs muy grandes (400+ páginas) pueden agotar el tiempo máximo de 5
        minutos en Vercel Hobby.
      </p>

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
