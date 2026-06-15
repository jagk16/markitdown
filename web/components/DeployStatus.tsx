"use client";

import { useEffect, useState } from "react";

type HealthResponse = {
  ok: boolean;
  version?: string;
  blob?: {
    tokenConfigured: boolean;
    storeConfigured: boolean;
    accessMode: string;
  };
  env?: {
    vercelEnv?: string;
    gitCommit?: string | null;
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

  return (
    <section className="deploy-status" aria-live="polite">
      <p>
        <strong>Estado del deploy:</strong>{" "}
        {health?.ok ? (
          <span className="status success">
            OK v{health.version} ({health.env?.vercelEnv ?? "local"})
          </span>
        ) : error ? (
          <span className="status error">{error}</span>
        ) : (
          <span>comprobando…</span>
        )}
      </p>
      {health?.blob && (
        <p className="dropzone-hint">
          Blob token: {health.blob.tokenConfigured ? "✓" : "✗"} · Store:{" "}
          {health.blob.storeConfigured ? "✓" : "✗"} · Modo:{" "}
          {health.blob.accessMode}
        </p>
      )}
      <p className="dropzone-hint">
        Diagnóstico:{" "}
        <a href="/api/health" target="_blank" rel="noopener noreferrer">
          /api/health
        </a>{" "}
        ·{" "}
        <a href="/health.txt" target="_blank" rel="noopener noreferrer">
          /health.txt
        </a>
      </p>
    </section>
  );
}
