// Correlation view for the Quantum Lab: the pairwise mutual-information matrix
// I(A:B) = S(A) + S(B) − S(AB) as a heatmap (total correlations, classical +
// quantum), plus |ρ_AB| for a chosen qubit pair. Reads the circuit store; pure
// metrics via density2. Needs n ≥ 2 to have a pair at all.

import { useState } from "react";
import { useQuantum, currentState } from "../../quantum/quantumStore.ts";
import { reducedDensity2, mutualInfoMatrix, magnitude4 } from "../../quantum/density2.ts";

// vermilion-500 = #c2451d; shade a cell by value/scale as its alpha.
const shade = (value: number, scale: number): string =>
  `rgba(194,69,29,${Math.max(0, Math.min(1, value / scale))})`;

const PAIR_LABELS = ["|00⟩", "|01⟩", "|10⟩", "|11⟩"]; // sub-index = qA + 2·qB (qA low bit)

export function CorrelationPanel() {
  const numQubits = useQuantum((s) => s.numQubits);
  const placements = useQuantum((s) => s.placements);
  const step = useQuantum((s) => s.step);

  const [qA, setQA] = useState(0);
  const [qB, setQB] = useState(1);

  const n = Math.max(1, numQubits);

  if (n < 2) {
    return (
      <p className="font-mono text-[11px] leading-relaxed text-graphite">
        La información mutua describe correlaciones entre pares de qubits: añade al menos
        2 qubits para verla.
      </p>
    );
  }

  const state = currentState({ numQubits: n, placements, step });
  const mi = mutualInfoMatrix(state, n);

  // Keep the selected pair valid and distinct as the register shrinks.
  const a = Math.min(qA, n - 1);
  let b = Math.min(qB, n - 1);
  if (b === a) b = a === 0 ? 1 : 0;
  const mag = magnitude4(reducedDensity2(state, a, b, n));
  const idx = Array.from({ length: n }, (_, i) => i);

  return (
    <div className="flex flex-col gap-3 font-mono text-[11px] text-ink">
      <p className="leading-relaxed text-graphite">
        La información mutua I(A:B) = S(A) + S(B) − S(AB) mide las correlaciones totales
        (clásicas + cuánticas) entre dos qubits: 0 bits = independientes, hasta 2 bits para
        un par máximamente entrelazado (Bell).
      </p>

      {/* Mutual-information heatmap: n×n, shaded 0..2 bits. */}
      <div className="overflow-x-auto">
        <table className="border-collapse tabular-nums">
          <thead>
            <tr>
              <th className="w-8" />
              {idx.map((j) => (
                <th key={j} className="px-1 pb-1 text-center font-normal text-graphite">q{j}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {idx.map((i) => (
              <tr key={i}>
                <th className="pr-1 text-right font-normal text-graphite">q{i}</th>
                {idx.map((j) => (
                  <td
                    key={j}
                    className="h-8 w-10 border border-line/60 text-center"
                    style={{ backgroundColor: i === j ? "transparent" : shade(mi[i][j], 2) }}
                    title={i === j ? "—" : `I(q${i}:q${j}) = ${mi[i][j].toFixed(3)} b`}
                  >
                    {i === j ? <span className="text-graphite/40">·</span> : mi[i][j].toFixed(2)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pair picker + |ρ_AB| magnitude heatmap. */}
      <div className="flex items-center gap-2 text-graphite">
        <span>Par</span>
        <select
          value={a}
          onChange={(e) => setQA(Number(e.target.value))}
          className="rounded border border-line bg-void-soft/85 px-1.5 py-1 text-ink focusable"
          aria-label="Qubit A"
        >
          {idx.map((j) => <option key={j} value={j}>q{j}</option>)}
        </select>
        <span>·</span>
        <select
          value={b}
          onChange={(e) => setQB(Number(e.target.value))}
          className="rounded border border-line bg-void-soft/85 px-1.5 py-1 text-ink focusable"
          aria-label="Qubit B"
        >
          {idx.map((j) => <option key={j} value={j}>q{j}</option>)}
        </select>
        <span className="ml-auto text-vermilion-200">I = {mi[a][b].toFixed(3)} b</span>
      </div>

      <div>
        <p className="mb-1 text-graphite">|ρ_AB| — magnitud de la densidad reducida del par (qA = q{a}, qB = q{b})</p>
        <table className="border-collapse tabular-nums">
          <thead>
            <tr>
              <th className="w-10" />
              {PAIR_LABELS.map((l) => (
                <th key={l} className="px-1 pb-1 text-center font-normal text-graphite">{l}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {mag.map((row, r) => (
              <tr key={r}>
                <th className="pr-1 text-right font-normal text-graphite">{PAIR_LABELS[r]}</th>
                {row.map((v, c) => (
                  <td
                    key={c}
                    className="h-8 w-12 border border-line/60 text-center"
                    style={{ backgroundColor: shade(v, 1) }}
                    title={`|ρ[${PAIR_LABELS[r]}][${PAIR_LABELS[c]}]| = ${v.toFixed(3)}`}
                  >
                    {v.toFixed(2)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
