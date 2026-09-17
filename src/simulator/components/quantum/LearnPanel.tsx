// "Learn" mode surface (req §19): an educational browser over GATE_DOCS.
// Left = gate list, right = the selected gate's matrix, effects, geometry and summary.
// Local-only selection state; reads no store. Never throws during render.

import "katex/dist/katex.min.css";
import { useState } from "react";
import { GATE_DOCS } from "../../quantum/gateDocs.ts";
import { tex, escapeHtml } from "../notebook/notebookRender.ts";

const DOCS = Object.values(GATE_DOCS);

const inlineMath = (t: string): string =>
  t.split(/\$([^$]+)\$/g).map((c, i) => (i % 2 ? tex(c) : escapeHtml(c))).join("");

export function LearnPanel() {
  const [id, setId] = useState(DOCS[0].id);
  const doc = GATE_DOCS[id];

  return (
    <div className="flex h-full min-h-0 flex-col">
      <p className="border-b border-line px-4 py-2 text-[11px] text-graphite">
        Explora cada compuerta: su matriz, cómo actúa sobre |0⟩ y |1⟩, y su interpretación geométrica.
      </p>
      <div className="flex min-h-0 flex-1">
        <nav className="flex w-28 shrink-0 flex-col gap-0.5 overflow-y-auto border-r border-line p-2 scroll-thin">
          {DOCS.map((d) => (
            <button
              key={d.id}
              onClick={() => setId(d.id)}
              className={`focusable rounded px-2 py-1 text-left font-mono text-[11px] transition ${
                d.id === id ? "bg-vermilion-500/15 text-vermilion-200 ring-1 ring-vermilion-400/40" : "text-graphite hover:bg-white/5 hover:text-ink"
              }`}
              title={d.name}
              aria-label={`Ver ${d.name}`}
            >
              {d.symbol}
            </button>
          ))}
        </nav>

        <div className="flex min-w-0 flex-1 flex-col gap-3 overflow-y-auto p-4 scroll-thin">
          <div className="flex items-baseline gap-2">
            <span className="font-display text-lg text-ink">{doc.name}</span>
            <span className="font-mono text-[11px] text-vermilion-300">{doc.symbol}</span>
          </div>

          {doc.matrixTex && (
            <div
              className="katex-block overflow-x-auto rounded bg-black/40 px-4 py-3 text-ink ring-1 ring-white/5 scroll-thin"
              dangerouslySetInnerHTML={{ __html: tex(doc.matrixTex, true) }}
            />
          )}

          <Field label="Sobre |0⟩" html={inlineMath(doc.effect0)} />
          <Field label="Sobre |1⟩" html={inlineMath(doc.effect1)} />
          <Field label="Interpretación geométrica" html={inlineMath(doc.geometry)} />
          <p className="text-[11px] leading-relaxed text-graphite">{doc.summary}</p>
        </div>
      </div>
    </div>
  );
}

function Field({ label, html }: { label: string; html: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-widest text-vermilion-300/70">{label}</span>
      <span className="text-[11px] leading-relaxed text-ink" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
