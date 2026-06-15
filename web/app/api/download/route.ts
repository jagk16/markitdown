import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Descarga archivos Blob privados usando el token del servidor (REST API). */
export async function GET(request: Request): Promise<NextResponse> {
  const pathname = new URL(request.url).searchParams.get("pathname");

  if (!pathname || !pathname.startsWith("outputs/")) {
    return NextResponse.json({ error: "pathname inválido." }, { status: 400 });
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "BLOB_READ_WRITE_TOKEN no configurado." },
      { status: 500 },
    );
  }

  try {
    const fileResponse = await fetch(
      `https://blob.vercel-storage.com/${pathname}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (fileResponse.status === 404) {
      return NextResponse.json({ error: "Archivo no encontrado." }, { status: 404 });
    }

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
