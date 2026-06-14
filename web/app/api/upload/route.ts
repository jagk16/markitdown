import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import {
  ALLOWED_CONTENT_TYPES,
  ALLOWED_EXTENSIONS,
  MAX_FILE_SIZE_BYTES,
} from "@/lib/constants";

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        const ext = pathname.slice(pathname.lastIndexOf(".")).toLowerCase();
        if (
          !ALLOWED_EXTENSIONS.includes(
            ext as (typeof ALLOWED_EXTENSIONS)[number],
          )
        ) {
          throw new Error(`Extensión no permitida: ${ext || "(vacía)"}`);
        }

        return {
          allowedContentTypes: [...ALLOWED_CONTENT_TYPES],
          maximumSizeInBytes: MAX_FILE_SIZE_BYTES,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ purpose: "markitdown-upload" }),
        };
      },
      onUploadCompleted: async () => {
        // Vercel Blob elimina entradas según cacheControlMaxAge / políticas del store.
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo iniciar la subida.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
