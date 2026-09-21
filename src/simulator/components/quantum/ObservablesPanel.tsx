// Observables panel for the Quantum Lab: per-qubit Pauli expectation values
// ⟨X⟩ ⟨Y⟩ ⟨Z⟩ as signed bars in [−1,1], plus the ⟨Z_i Z_j⟩ correlation matrix.
// Reads the circuit store; pure math via ../../quantum/observables.ts.

import { useQuantum, currentState } from "../../quantum/quantumStore.ts";
import { expectX, expectY, expectZ, expectZZ } from "../../quantum/observables.ts";

export function ObservablesPanel() {
  const numQubits = useQuantum((s) => s.numQubits);
  const placements = useQuantum((s) => s.placements);
  const step = useQuantum((s) => s.step);

  const n = Math.max(1, numQubits);
  if (n < 1) return null;
  const state = currentState({ numQubits: n, placements, step });

  const rows: { qubit: number; x: number; y: number; z: number }[] = [];
  for (let q = 0; q < n; q++) {
    rows.push({ qubit: q, x: expectX(state, q, n), y: expectY(state, q, n), z: expectZ(state, q, n) });
  }

  return (
    <div className="flex flex-col gap-3 font-mono text-[11px] text-ink">
      <p className="leading-relaxed text-graphite">
        ⟨P⟩ = ⟨ψ|P|ψ⟩ es el valor esperado del observable P: el promedio de +1/−1
        al medir en esa base. +1 (verde/derecha) y −1 (rojo/izquierda) son estados
        propios; 0 (centro) es máxima incertidumbre.
      </p>

      <div className="flex flex-col gap-2">
        {rows.map((r) => (
          <div key={r.qubit} className="flex items-center gap-2">
            <span className="w-7 shrink-0 text-graphite">q{r.qubit}</span>
            <SignedBar label="⟨X⟩" value={r.x} />
            <SignedBar label="⟨Y⟩" value={r.y} />
            <SignedBar label="⟨Z⟩" value={r.z} />
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-graphite">Correlación ⟨Z_i Z_j⟩</span>
        <div className="scroll-thin overflow-x-auto">
          <table className="border-collapse tabular-nums">
            <thead>
              <tr>
                <th className="p-1" />
                {rows.map((c) => (
                  <th key={c.qubit} className="p-1 text-graphite font-normal">q{c.qubit}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.qubit}>
                  <th className="p-1 text-graphite font-normal">q{r.qubit}</th>
                  {rows.map((c) => {
                    const v = r.qubit === c.qubit ? 1 : expectZZ(state, r.qubit, c.qubit, n);
                    return <CorrCell key={c.qubit} value={v} />;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// A signed bar centered at 0: positive fills right (teal), negative left (vermilion).
function SignedBar({ label, value }: { label: string; value: number }) {
  const mag = Math.min(1, Math.abs(value));
  const positive = value >= 0;
  return (
    <div className="flex min-w-0 flex-1 items-center gap-1">
      <span className="w-8 shrink-0 text-graphite">{label}</span>
      <div className="relative h-3 flex-1 overflow-hidden rounded border border-line bg-void-soft/60">
        <div className="absolute inset-y-0 left-1/2 w-px bg-line" />
        {positive ? (
          <div className="absolute inset-y-0 left-1/2 bg-teal" style={{ width: `${mag * 50}%` }} />
        ) : (
          <div className="absolute inset-y-0 right-1/2 bg-vermilion-500/80" style={{ width: `${mag * 50}%` }} />
        )}
      </div>
      <span className="w-11 shrink-0 text-right tabular-nums text-ink">{value.toFixed(3)}</span>
    </div>
  );
}

// Correlation matrix cell: shaded teal (+) / vermilion (−) by magnitude.
function CorrCell({ value }: { value: number }) {
  const mag = Math.min(1, Math.abs(value));
  const positive = value >= 0;
  return (
    <td className="relative p-1 text-center">
      <div
        className={`absolute inset-0.5 rounded ${positive ? "bg-teal" : "bg-vermilion-500"}`}
        style={{ opacity: mag * 0.75 }}
      />
      <span className="relative tabular-nums text-ink">{value.toFixed(2)}</span>
    </td>
  );
}
