// Phase disks (IBM Composer style) for the Quantum Lab: one disk per qubit.
// The teal fill (rising from the bottom, like a filling gauge) encodes P(|1⟩);
// the vermilion needle points at the local relative phase (0 rad = east, CCW).
// For entangled qubits the reduced state is mixed (purity < 1) — the needle is
// dimmed since the coherence, and thus the phase, is only partial. Pure SVG.

import { useQuantum, currentState } from "../../quantum/quantumStore.ts";
import { phaseDisks } from "../../quantum/phaseDisk.ts";

const R = 34; // disk radius in SVG units
const BOX = 80; // viewBox side; center at BOX/2

export function PhaseDiskPanel() {
  const numQubits = useQuantum((s) => s.numQubits);
  const placements = useQuantum((s) => s.placements);
  const step = useQuantum((s) => s.step);

  const n = Math.max(1, numQubits);
  const state = currentState({ numQubits: n, placements, step });
  const disks = phaseDisks(state, n);

  if (disks.length === 0) {
    return <p className="font-mono text-[11px] text-graphite">Sin qubits.</p>;
  }

  return (
    <div className="flex flex-col gap-3 font-mono text-[11px] text-ink">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
        {disks.map((d) => {
          const c = BOX / 2;
          const fillH = 2 * R * Math.max(0, Math.min(1, d.p1)); // water level from bottom
          const fillY = c + R - fillH;
          // Needle: 0 rad = east, CCW positive. SVG y grows downward → negate sin.
          const nx = c + R * Math.cos(d.phase);
          const ny = c - R * Math.sin(d.phase);
          const mixed = d.purity < 1 - 1e-6;
          const deg = ((d.phase * 180) / Math.PI).toFixed(0);
          return (
            <div key={d.qubit} className="rounded-lg border border-line bg-void-soft/40 p-2">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-vermilion-200">q{d.qubit}</span>
                {mixed && (
                  <span className="text-vermilion-300" title={`Mixto (pureza ${d.purity.toFixed(2)})`}>
                    mixto
                  </span>
                )}
              </div>
              <svg viewBox={`0 0 ${BOX} ${BOX}`} className="mx-auto block h-24 w-24" role="img"
                aria-label={`q${d.qubit}: P(1)=${d.p1.toFixed(2)}, fase ${deg}°`}>
                <defs>
                  <clipPath id={`disk-${d.qubit}`}>
                    <circle cx={c} cy={c} r={R} />
                  </clipPath>
                </defs>
                {/* population fill (P|1⟩), clipped to the disk */}
                <rect x={c - R} y={fillY} width={2 * R} height={fillH} clipPath={`url(#disk-${d.qubit})`}
                  fill="var(--color-teal)" opacity={0.55} />
                {/* disk outline */}
                <circle cx={c} cy={c} r={R} fill="none" stroke="var(--color-line)" strokeWidth={1.5} />
                {/* phase needle */}
                <line x1={c} y1={c} x2={nx} y2={ny} stroke="var(--color-vermilion-400)"
                  strokeWidth={2} strokeLinecap="round" opacity={mixed ? 0.45 : 1} />
                <circle cx={c} cy={c} r={2} fill="var(--color-vermilion-400)" opacity={mixed ? 0.45 : 1} />
              </svg>
              <dl className="mt-1 grid grid-cols-2 gap-x-2 tabular-nums text-[10px]">
                <div className="flex items-center justify-between border-b border-line/50 py-0.5">
                  <dt className="text-graphite">P(1)</dt>
                  <dd className="text-ink">{d.p1.toFixed(2)}</dd>
                </div>
                <div className="flex items-center justify-between border-b border-line/50 py-0.5">
                  <dt className="text-graphite">φ</dt>
                  <dd className="text-ink">{deg}°</dd>
                </div>
              </dl>
            </div>
          );
        })}
      </div>

      <p className="leading-relaxed text-graphite">
        El disco muestra P(|1⟩) (relleno) y la fase relativa local (aguja). Para
        qubits entrelazados el estado es mixto (pureza &lt; 1) y la fase deja de
        estar bien definida.
      </p>
    </div>
  );
}
