import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { isBlobConfigured } from "@/lib/blob-config";
import { MAX_SPLIT_FILE_SIZE_BYTES } from "@/lib/constants";

export const runtime = "nodejs";

/** Subida a Blob para división de PDF (límite mayor que conversión). */
export async function POST(request: Request): Promise<NextResponse> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;

  if (!isBlobConfigured()) {
    return NextResponse.json(
      { error: "BLOB_READ_WRITE_TOKEN o BLOB_STORE_ID no configurados." },
      { status: 500 },
    );
  }

  let body: HandleUploadBody;
  try {
    body = (await request.json()) as HandleUploadBody;
  } catch {
    return NextResponse.json({ error: "Cuerpo JSON inválido." }, { status: 400 });
  }

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      token,
      onBeforeGenerateToken: async () => ({
        maximumSizeInBytes: MAX_SPLIT_FILE_SIZE_BYTES,
        addRandomSuffix: true,
      }),
      onUploadCompleted: async () => {},
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo generar el token de subida.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
