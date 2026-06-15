import { head } from "@vercel/blob";
import { NextResponse } from "next/server";
import { getBlobReadWriteToken } from "@/lib/blob-config";

export const dynamic = "force-dynamic";

/** Descarga archivos .md desde Blob (resuelve URL con token, sin depender de BLOB_STORE_ID). */
export async function GET(request: Request): Promise<NextResponse> {
  const pathname = new URL(request.url).searchParams.get("pathname");

  if (!pathname || !pathname.startsWith("outputs/")) {
    return NextResponse.json({ error: "pathname inválido." }, { status: 400 });
  }

  const token = getBlobReadWriteToken();
  if (!token) {
    return NextResponse.json(
      { error: "BLOB_READ_WRITE_TOKEN no configurado." },
      { status: 500 },
    );
  }

  try {
    const meta = await head(pathname, { token });
    const blobUrl = meta.downloadUrl ?? meta.url;
    const fileResponse = await fetch(blobUrl);
    if (!fileResponse.ok) {
      return NextResponse.json({ error: "Archivo no encontrado." }, { status: 404 });
    }

    const body = await fileResponse.text();
    const filename = pathname.split("/").pop() ?? "document.md";

    return new NextResponse(body, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error al descargar el archivo.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
