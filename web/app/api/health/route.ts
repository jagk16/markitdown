import { NextResponse } from "next/server";
import { getBlobAccess, hasBlobStore, hasBlobToken } from "@/lib/blob-config";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    ok: true,
    service: "markitdown-web",
    version: "1.1.0",
    runtime: "vercel",
    timestamp: new Date().toISOString(),
    env: {
      nodeEnv: process.env.NODE_ENV ?? "unknown",
      vercelEnv: process.env.VERCEL_ENV ?? "local",
      vercelUrl: process.env.VERCEL_URL ?? null,
      gitCommit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
      rootDirectory: "web",
    },
    blob: {
      tokenConfigured: hasBlobToken(),
      storeConfigured: hasBlobStore(),
      accessMode: getBlobAccess(),
      storeId: process.env.BLOB_STORE_ID ? "set" : "missing",
    },
    routes: {
      home: "/",
      health: "/api/health",
      upload: "/api/upload",
      convert: "/api/convert",
      staticTest: "/health.txt",
    },
    hint:
      "Si ves este JSON pero / da 404, el deploy de Next.js está incompleto. Revisa Root Directory=web y el log de build.",
  });
}
