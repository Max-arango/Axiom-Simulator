// OpenQASM 2.0 code view (IBM Composer's signature panel). Export recomputes from
// the store on every render; import is the UNTRUSTED entry point — it leans on
// fromQasm()'s validation and only surfaces the thrown Error, never crashing.

import { useState } from "react";
import { useQuantum, toCircuit } from "../../quantum/quantumStore.ts";
import { toQasm, fromQasm } from "../../quantum/qasm.ts";
import { downloadText } from "./downloads.ts";

export function QasmPanel() {
  const numQubits = useQuantum((s) => s.numQubits);
  const placements = useQuantum((s) => s.placements);
  const loadCircuit = useQuantum((s) => s.loadCircuit);

  let code: string;
  try {
    code = toQasm(toCircuit({ numQubits, placements }));
  } catch (e) {
    code = `// Error: ${(e as Error).message}`; // never throw during render
  }

  const [copied, setCopied] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const copy = () => {
    if (!navigator?.clipboard?.writeText) return; // insecure context / old browser
    navigator.clipboard
      .writeText(code)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => {});
  };

  const load = () => {
    try {
      loadCircuit(fromQasm(text));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto p-4 scroll-thin">
      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-widest text-vermilion-300/70">Código QASM</span>
          <div className="flex gap-1.5">
            <button
              onClick={copy}
              className="focusable rounded border border-line px-2.5 py-1 text-[11px] text-vermilion-300 transition hover:border-vermilion-400/50 hover:bg-vermilion-500/10"
              title="Copiar el código OpenQASM al portapapeles"
              aria-label="Copiar QASM"
            >
              {copied ? "Copiado ✓" : "Copiar"}
            </button>
            <button
              onClick={() => downloadText("circuito.qasm", code, "text/plain")}
              className="focusable rounded border border-line px-2.5 py-1 text-[11px] text-vermilion-300 transition hover:border-vermilion-400/50 hover:bg-vermilion-500/10"
              title="Descargar el código como archivo .qasm"
              aria-label="Descargar QASM"
            >
              Descargar .qasm
            </button>
          </div>
        </div>
        <pre className="h-48 w-full overflow-x-auto overflow-y-auto rounded border border-line bg-void-soft p-2 font-mono text-[11px] leading-relaxed text-graphite whitespace-pre-wrap scroll-thin">
          {code}
        </pre>
      </section>

      <section className="flex flex-col gap-2 border-t border-line pt-4">
        <span className="text-[10px] uppercase tracking-widest text-vermilion-300/70">Importar QASM</span>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Pega aquí código OpenQASM 2.0…"
          className="focusable h-40 w-full resize-none rounded border border-line bg-void-soft p-2 font-mono text-[11px] text-ink outline-none scroll-thin placeholder:text-graphite/60"
          aria-label="QASM a importar"
        />
        <div className="flex items-center gap-3">
          <button
            onClick={load}
            className="focusable rounded border border-line px-3 py-1.5 text-[11px] text-vermilion-300 transition hover:border-vermilion-400/50 hover:bg-vermilion-500/10"
            title="Cargar el circuito desde el código QASM pegado"
            aria-label="Importar circuito QASM"
          >
            Importar
          </button>
          {error && <span className="text-[11px] leading-snug text-vermilion-300">{error}</span>}
        </div>
      </section>
    </div>
  );
}
