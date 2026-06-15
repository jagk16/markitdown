"use client";

import { useEffect, useState } from "react";

type HealthResponse = {
  ok: boolean;
  version?: string;
  fixHint?: string;
  blob?: {
    storeId?: string | null;
    tokenConfigured: boolean;
    connectionTest?: { ok: boolean; error?: string };
  };
};

export default function DeployStatus() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/health")
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Health check HTTP ${response.status}`);
        }
        return response.json() as Promise<HealthResponse>;
      })
      .then((data) => setHealth(data))
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Health check falló");
      });
  }, []);

  const blobOk = health?.blob?.connectionTest?.ok;

  return (
    <section className="deploy-status" aria-live="polite">
      <p>
        <strong>Estado Blob:</strong>{" "}
        {health ? (
          blobOk ? (
            <span className="status success">Conectado v{health.version}</span>
          ) : (
            <span className="status error">No conectado</span>
          )
        ) : error ? (
          <span className="status error">{error}</span>
        ) : (
          <span>comprobando…</span>
        )}
      </p>
      {health?.blob && (
        <>
          <p className="dropzone-hint">
            Token: {health.blob.tokenConfigured ? "✓" : "✗"} · Store:{" "}
            {health.blob.storeId ? "✓" : "✗"}
          </p>
          {health.blob.connectionTest?.error && (
            <p className="status error" style={{ fontSize: "0.85rem" }}>
              {health.blob.connectionTest.error}
            </p>
          )}
          {health.fixHint && !blobOk && (
            <p className="dropzone-hint" style={{ color: "#fcd34d" }}>
              {health.fixHint}
            </p>
          )}
        </>
      )}
    </section>
  );
}
