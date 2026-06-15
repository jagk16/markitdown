import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { getBlobAccess } from "@/lib/blob-config";
import {
  ALLOWED_EXTENSIONS,
  MAX_FILE_SIZE_BYTES,
} from "@/lib/constants";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    return NextResponse.json(
      {
        error:
          "BLOB_READ_WRITE_TOKEN no configurado. Ve a Storage → Blob → Connect to Project y redeploy.",
      },
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
          maximumSizeInBytes: MAX_FILE_SIZE_BYTES,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({
            purpose: "markitdown-upload",
            access: getBlobAccess(),
          }),
        };
      },
      onUploadCompleted: async () => {
        // Callback opcional; Vercel notifica cuando termina la subida del cliente.
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo iniciar la subida.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
