// JSON import/export for the circuit (spec §18). Export recomputes from the store
// on every render; import is the UNTRUSTED-input entry point — it leans entirely on
// deserialize()'s validation and only surfaces the thrown Error message, never crashes.

import { useState } from "react";
import { useQuantum, toCircuit } from "../../quantum/quantumStore.ts";
import { serialize, deserialize, toText } from "../../quantum/circuit.ts";
import { downloadText } from "./downloads.ts";

export function ImportExportPanel() {
  const numQubits = useQuantum((s) => s.numQubits);
  const placements = useQuantum((s) => s.placements);
  const loadCircuit = useQuantum((s) => s.loadCircuit);

  const circuit = toCircuit({ numQubits, placements });
  const json = serialize(circuit);
  const ascii = toText(circuit);

  const [copied, setCopied] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const copy = () => {
    if (!navigator?.clipboard) return; // no clipboard API (insecure context / old browser)
    navigator.clipboard
      .writeText(json)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => {});
  };

  const load = () => {
    try {
      loadCircuit(deserialize(text));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto p-4 scroll-thin">
      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-widest text-vermilion-300/70">Exportar</span>
          <div className="flex gap-1.5">
            <button
              onClick={copy}
              className="focusable rounded border border-line px-2.5 py-1 text-[11px] text-vermilion-300 transition hover:border-vermilion-400/50 hover:bg-vermilion-500/10"
              title="Copiar el JSON del circuito al portapapeles"
              aria-label="Copiar JSON"
            >
              {copied ? "Copiado ✓" : "Copiar JSON"}
            </button>
            <button
              onClick={() => downloadText("circuito.json", json, "application/json")}
              className="focusable rounded border border-line px-2.5 py-1 text-[11px] text-vermilion-300 transition hover:border-vermilion-400/50 hover:bg-vermilion-500/10"
              title="Descargar el circuito como archivo .json"
              aria-label="Descargar JSON"
            >
              Descargar JSON
            </button>
          </div>
        </div>
        <textarea
          readOnly
          value={json}
          className="h-40 w-full resize-none rounded border border-line bg-black/40 p-2 font-mono text-[11px] text-ink outline-none scroll-thin focus:ring-1 focus:ring-vermilion-400"
          aria-label="JSON del circuito"
        />
        <span className="text-[10px] uppercase tracking-widest text-vermilion-300/70">Vista de texto</span>
        <pre className="overflow-x-auto rounded border border-line bg-black/40 p-2 font-mono text-[11px] leading-relaxed text-graphite scroll-thin">
          {ascii}
        </pre>
      </section>

      <section className="flex flex-col gap-2 border-t border-line pt-4">
        <span className="text-[10px] uppercase tracking-widest text-vermilion-300/70">Importar</span>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Pega aquí el JSON de un circuito…"
          className="h-40 w-full resize-none rounded border border-line bg-black/40 p-2 font-mono text-[11px] text-ink outline-none scroll-thin placeholder:text-graphite/60 focus:ring-1 focus:ring-vermilion-400"
          aria-label="JSON a importar"
        />
        <div className="flex items-center gap-3">
          <button
            onClick={load}
            className="focusable rounded border border-line px-3 py-1.5 text-[11px] text-vermilion-300 transition hover:border-vermilion-400/50 hover:bg-vermilion-500/10"
            title="Cargar el circuito desde el JSON pegado"
            aria-label="Cargar circuito"
          >
            Cargar
          </button>
          {error && <span className="text-[11px] leading-snug text-vermilion-300">{error}</span>}
        </div>
      </section>
    </div>
  );
}
