import { get } from "@vercel/blob";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Descarga archivos Blob privados usando el token del servidor. */
export async function GET(request: Request): Promise<NextResponse> {
  const pathname = new URL(request.url).searchParams.get("pathname");

  if (!pathname || !pathname.startsWith("outputs/")) {
    return NextResponse.json({ error: "pathname inválido." }, { status: 400 });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: "BLOB_READ_WRITE_TOKEN no configurado." },
      { status: 500 },
    );
  }

  try {
    const result = await get(pathname, { access: "private" });

    if (!result || !result.url) {
      return NextResponse.json({ error: "Archivo no encontrado." }, { status: 404 });
    }

    const fileResponse = await fetch(result.url, {
      headers: {
        Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`,
      },
    });

    if (!fileResponse.ok) {
      return NextResponse.json(
        { error: `No se pudo leer el archivo (HTTP ${fileResponse.status}).` },
        { status: 502 },
      );
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
