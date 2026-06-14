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
      <body>{children}</body>
    </html>
  );
}
