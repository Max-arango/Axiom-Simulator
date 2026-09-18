// Bloch analyzer for the Quantum Lab: shows ALL qubits' Bloch spheres at once,
// each from its reduced density matrix. For an entangled qubit |r| < 1 and the
// vector is the honest reduced-state vector, not a pure state — flagged per cell.

import { QubitBloch } from "./QubitBloch.tsx";
import { useQuantum, currentState } from "../../quantum/quantumStore.ts";
import { qubitReport, anyEntangled } from "./entReport.ts";

export function BlochPanel() {
  const numQubits = useQuantum((s) => s.numQubits);
  const placements = useQuantum((s) => s.placements);
  const step = useQuantum((s) => s.step);

  const n = Math.max(1, numQubits);
  const state = currentState({ numQubits: n, placements, step });
  const report = qubitReport(state, n);

  return (
    <div className="flex flex-col gap-3 font-mono text-[11px] text-ink">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {report.map((q) => {
          const [x, y, z] = q.bloch;
          return (
            <div key={q.qubit} className="rounded-lg border border-line bg-void-soft/40 p-2">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-vermilion-200">q{q.qubit}</span>
                <span
                  className={q.entangled ? "text-vermilion-300" : "text-graphite"}
                  title={q.entangled ? "Entrelazado (estado mixto)" : "Estado puro"}
                >
                  {q.entangled ? "entrelazado" : "puro"}
                </span>
              </div>
              <div className="relative h-44 overflow-hidden rounded border border-line/60 bg-black/30">
                <QubitBloch vec={q.bloch} />
              </div>
              <dl className="mt-1.5 grid grid-cols-3 gap-x-2 tabular-nums text-[10px]">
                <Metric label="x" value={x.toFixed(2)} />
                <Metric label="y" value={y.toFixed(2)} />
                <Metric label="z" value={z.toFixed(2)} />
                <Metric label="|r|" value={q.r.toFixed(2)} />
                <Metric label="pur" value={q.purity.toFixed(2)} />
                <Metric label="S" value={q.entropy.toFixed(2)} />
              </dl>
            </div>
          );
        })}
      </div>

      {anyEntangled(report) && (
        <p className="rounded-lg border border-vermilion-400/30 bg-vermilion-500/10 px-3 py-2 leading-relaxed text-vermilion-200">
          Hay qubits entrelazados: no poseen un estado puro. Se muestra el vector
          de Bloch de su matriz de densidad reducida (|r| &lt; 1, el vector queda
          dentro de la esfera).
        </p>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-line/50 py-0.5">
      <dt className="text-graphite">{label}</dt>
      <dd className="text-ink">{value}</dd>
    </div>
  );
}
