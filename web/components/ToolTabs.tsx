"use client";

import { useState } from "react";
import DropZone from "@/components/DropZone";
import PdfSplitter from "@/components/PdfSplitter";

type ToolTab = "convert" | "split";

export default function ToolTabs() {
  const [tab, setTab] = useState<ToolTab>("convert");

  return (
    <div className="tool-tabs-wrap">
      <p className="tool-tabs-heading">Elige una herramienta</p>
      <div className="tool-tabs" role="tablist" aria-label="Herramientas">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "convert"}
          className={`tool-tab${tab === "convert" ? " active" : ""}`}
          onClick={() => setTab("convert")}
        >
          Convertir a Markdown
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "split"}
          className={`tool-tab${tab === "split" ? " active" : ""}`}
          onClick={() => setTab("split")}
        >
          Dividir PDF
        </button>
      </div>

      <div className="tool-panel" role="tabpanel">
        {tab === "convert" ? <DropZone /> : <PdfSplitter />}
      </div>
    </div>
  );
}
