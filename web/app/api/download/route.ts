import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Descarga archivos .md públicos desde Blob. */
export async function GET(request: Request): Promise<NextResponse> {
  const pathname = new URL(request.url).searchParams.get("pathname");

  if (!pathname || !pathname.startsWith("outputs/")) {
    return NextResponse.json({ error: "pathname inválido." }, { status: 400 });
  }

  const storeId = process.env.BLOB_STORE_ID?.replace("store_", "") ?? "";
  const url = `https://${storeId}.public.blob.vercel-storage.com/${pathname}`;

  try {
    const fileResponse = await fetch(url);
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
