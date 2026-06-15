import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { isBlobConfigured } from "@/lib/blob-config";

export const runtime = "nodejs";

/** Guarda Markdown en Blob con put() y BLOB_READ_WRITE_TOKEN. */
export async function POST(request: Request): Promise<NextResponse> {
  if (!isBlobConfigured()) {
    return NextResponse.json(
      { error: "BLOB_READ_WRITE_TOKEN o BLOB_STORE_ID no configurados." },
      { status: 500 },
    );
  }

  try {
    const body = (await request.json()) as { content?: string; filename?: string };
    const content = body.content ?? "";
    const filename = (body.filename ?? "document.md").replace(/[^a-zA-Z0-9._-]/g, "-");

    if (!content.trim()) {
      return NextResponse.json({ error: "Contenido vacío." }, { status: 400 });
    }

    const blob = await put(`outputs/${filename}`, content, {
      access: "public",
      addRandomSuffix: true,
      contentType: "text/markdown; charset=utf-8",
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    return NextResponse.json({
      downloadUrl: blob.url,
      downloadPath: blob.pathname,
      filename: `${filename}.md`,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error al guardar en Blob.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
