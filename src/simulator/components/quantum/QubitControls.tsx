import { useQuantum } from "../../quantum/quantumStore.ts";
import { MAX_QUBITS } from "../../quantum/types.ts";

const COUNTS = Array.from({ length: MAX_QUBITS }, (_, i) => i + 1); // 1..MAX_QUBITS

export function QubitControls() {
  const numQubits = useQuantum((s) => s.numQubits);
  const setNumQubits = useQuantum((s) => s.setNumQubits);
  const clearCircuit = useQuantum((s) => s.clearCircuit);

  return (
    <div className="flex flex-wrap items-center gap-3 font-mono text-ink">
      <div className="flex items-center gap-2">
        <span className="text-[11px] uppercase tracking-widest text-vermilion-300/70 font-display">Qubits</span>
        <div className="flex gap-1">
          {COUNTS.map((n) => {
            const active = n === numQubits;
            return (
              <button
                key={n}
                title={`${n} qubit${n > 1 ? "s" : ""}`}
                aria-label={`${n} qubit${n > 1 ? "s" : ""}`}
                aria-pressed={active}
                onClick={() => setNumQubits(n)}
                className={`flex size-8 items-center justify-center rounded border text-[13px] tabular-nums transition focusable ${
                  active
                    ? "border-vermilion-400/60 bg-vermilion-500/25 text-vermilion-100"
                    : "border-line bg-void-soft/85 text-ink hover:border-vermilion-400/40 hover:text-vermilion-200"
                }`}
              >
                {n}
              </button>
            );
          })}
        </div>
      </div>

      <button
        title="Limpiar circuito"
        aria-label="Limpiar circuito"
        onClick={clearCircuit}
        className="rounded border border-line bg-void-soft/85 px-3 py-1.5 text-[12px] text-graphite transition hover:border-vermilion-400/50 hover:text-vermilion-200 focusable"
      >
        Limpiar circuito
      </button>
    </div>
  );
}
