// Entanglement overview for the Quantum Lab. One row per qubit: von Neumann
// entropy of entanglement (0..1 bits) as a bar, plus purity, marking qubits
// entangled with the rest. Reads the circuit store; pure metrics via entReport.

import { useQuantum, currentState } from "../../quantum/quantumStore.ts";
import { qubitReport, anyEntangled } from "./entReport.ts";

export function EntanglementPanel() {
  const numQubits = useQuantum((s) => s.numQubits);
  const placements = useQuantum((s) => s.placements);
  const step = useQuantum((s) => s.step);

  const n = Math.max(1, numQubits);
  const state = currentState({ numQubits: n, placements, step });
  const rep = qubitReport(state, n);
  const someEntangled = anyEntangled(rep);
  // Bell/GHZ-like: at least one qubit maximally entangled with the rest.
  const maximal = rep.some((q) => q.entropy > 0.999);

  return (
    <div className="flex flex-col gap-3 font-mono text-[11px] text-ink">
      <p className="leading-relaxed text-graphite">
        La entropía de von Neumann de la densidad reducida de cada qubit mide su
        entrelazamiento con el resto: 0 bits = separable (estado puro), 1 bit =
        máximamente entrelazado con el resto.
      </p>

      <div className="flex flex-col gap-2">
        {rep.map((q) => (
          <div key={q.qubit} className="flex items-center gap-2">
            <span className="w-7 shrink-0 text-graphite">q{q.qubit}</span>
            <div className="relative h-3.5 flex-1 overflow-hidden rounded border border-line bg-void-soft/60">
              <div
                className={`h-full transition-[width] duration-200 ${q.entangled ? "bg-vermilion-500/70" : "bg-graphite/40"}`}
                style={{ width: `${Math.min(1, Math.max(0, q.entropy)) * 100}%` }}
              />
            </div>
            <span className="w-16 shrink-0 text-right tabular-nums text-ink">{q.entropy.toFixed(3)} b</span>
            <span className="w-20 shrink-0 text-right tabular-nums text-graphite">P {q.purity.toFixed(3)}</span>
            {q.entangled && (
              <span className="shrink-0 text-vermilion-300" title="Entrelazado con el resto" aria-label="Entrelazado con el resto">●</span>
            )}
          </div>
        ))}
      </div>

      {someEntangled ? (
        <p className="rounded-lg border border-vermilion-400/30 bg-vermilion-500/10 px-3 py-2 leading-relaxed text-vermilion-200">
          {maximal
            ? "Hay qubits máximamente entrelazados (≈1 bit): correlación tipo Bell/GHZ con el resto del registro."
            : "Hay entrelazamiento parcial: algunos qubits comparten información con el resto."}
        </p>
      ) : (
        <p className="text-graphite">Sin entrelazamiento: todos los qubits están en un estado puro (separable).</p>
      )}
    </div>
  );
}
