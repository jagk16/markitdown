import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MarkItDown — Convertir archivos a Markdown",
  description:
    "Sube PDF, Office y más. Obtén Markdown listo para LLMs y pipelines de texto.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>
        <div className="page-shell">
          <header className="site-header">
            <a className="site-brand" href="/">
              <span className="brand-dot" aria-hidden />
              MarkItDown
            </a>
            <span className="dropzone-hint" style={{ fontSize: "0.8rem" }}>
              por D-Talent
            </span>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
