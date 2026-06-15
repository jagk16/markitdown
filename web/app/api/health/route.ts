import { list } from "@vercel/blob";
import { NextResponse } from "next/server";
import {
  getBlobStoreId,
  hasBlobToken,
  isBlobConfigured,
} from "@/lib/blob-config";

export const dynamic = "force-dynamic";

async function testBlobConnection(): Promise<{ ok: boolean; error?: string }> {
  if (!isBlobConfigured()) {
    return {
      ok: false,
      error: "Faltan BLOB_READ_WRITE_TOKEN o BLOB_STORE_ID",
    };
  }

  try {
    await list({ limit: 1, token: process.env.BLOB_READ_WRITE_TOKEN });
    return { ok: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error al conectar con Blob";
    return { ok: false, error: message };
  }
}

export async function GET(): Promise<NextResponse> {
  const blobTest = await testBlobConnection();

  return NextResponse.json({
    ok: blobTest.ok,
    service: "markitdown-web",
    version: "1.4.0",
    timestamp: new Date().toISOString(),
    blob: {
      storeId: getBlobStoreId() ?? null,
      tokenConfigured: hasBlobToken(),
      connectionTest: blobTest,
    },
    fixHint: blobTest.ok
      ? "Blob OK. Puedes subir archivos."
      : "Verifica BLOB_READ_WRITE_TOKEN y BLOB_STORE_ID en Environment Variables y redeploy.",
  });
}
