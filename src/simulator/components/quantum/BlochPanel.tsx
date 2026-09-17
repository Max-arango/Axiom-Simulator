// Per-qubit Bloch sphere for the Quantum Lab. Reads the circuit store, picks a
// qubit and shows the Bloch vector of its reduced density matrix. For entangled
// qubits |r| < 1 and the vector is the honest reduced-state vector, not a pure
// state — a note makes that explicit.

import { QubitBloch } from "./QubitBloch.tsx";
import { useQuantum, currentState } from "../../quantum/quantumStore.ts";
import { blochOf, reducedDensity, purity, vonNeumannEntropy, isEntangled } from "../../quantum/density.ts";

export function BlochPanel() {
  const numQubits = useQuantum((s) => s.numQubits);
  const placements = useQuantum((s) => s.placements);
  const step = useQuantum((s) => s.step);
  const selectedQubit = useQuantum((s) => s.selectedQubit);
  const setSelectedQubit = useQuantum((s) => s.setSelectedQubit);

  const n = Math.max(1, numQubits);
  const q = Math.min(Math.max(0, selectedQubit), n - 1);
  const state = currentState({ numQubits: n, placements, step });
  const vec = blochOf(state, q, n);
  const rho = reducedDensity(state, q, n);
  const [x, y, z] = vec;
  const r = Math.hypot(x, y, z);
  const pur = purity(rho);
  const S = vonNeumannEntropy(rho);
  const entangled = isEntangled(state, q, n);

  return (
    <div className="flex flex-col gap-3 font-mono text-[11px] text-ink">
      <div className="flex flex-wrap gap-1.5">
        {Array.from({ length: n }, (_, i) => (
          <button
            key={i}
            onClick={() => setSelectedQubit(i)}
            title={`Qubit ${i}`}
            aria-label={`Seleccionar qubit ${i}`}
            aria-pressed={i === q}
            className={`focusable rounded border px-2.5 py-1 transition ${
              i === q
                ? "border-vermilion-400/50 bg-vermilion-500/20 text-vermilion-200"
                : "border-line bg-void-soft/80 text-graphite hover:text-vermilion-200"
            }`}
          >
            q{i}
          </button>
        ))}
      </div>

      <div className="relative h-64 overflow-hidden rounded-lg border border-line bg-void-soft/40">
        <QubitBloch vec={vec} />
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 tabular-nums">
        <Metric label="x" value={x.toFixed(3)} />
        <Metric label="y" value={y.toFixed(3)} />
        <Metric label="z" value={z.toFixed(3)} />
        <Metric label="|r|" value={r.toFixed(3)} />
        <Metric label="pureza" value={pur.toFixed(3)} />
        <Metric label="entropía" value={`${S.toFixed(3)} bits`} />
      </dl>

      {entangled && (
        <p className="rounded-lg border border-vermilion-400/30 bg-vermilion-500/10 px-3 py-2 leading-relaxed text-vermilion-200">
          Estado entrelazado: este qubit no posee un estado puro. Se muestra el
          vector de Bloch de su matriz de densidad reducida (|r| &lt; 1).
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
