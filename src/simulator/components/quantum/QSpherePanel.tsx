// Q-sphere panel for the Quantum Lab: reads the circuit's current statevector and
// renders it as IBM's multi-amplitude Q-sphere. Latitude = nº de unos, radio del
// nodo = probabilidad, color = fase. A tiny legend maps the phase colour wheel.

import { QSphere } from "./QSphere.tsx";
import { useQuantum, currentState } from "../../quantum/quantumStore.ts";
import { phaseColor } from "../../quantum/qsphere.ts";

const swatch = (phase: number): string => {
  const [r, g, b] = phaseColor(phase);
  return `rgb(${Math.round(r * 255)} ${Math.round(g * 255)} ${Math.round(b * 255)})`;
};

const LEGEND: { phase: number; label: string }[] = [
  { phase: 0, label: "0" },
  { phase: Math.PI / 2, label: "π/2" },
  { phase: Math.PI, label: "π" },
  { phase: -Math.PI / 2, label: "3π/2" },
];

export function QSpherePanel() {
  const numQubits = useQuantum((s) => s.numQubits);
  const placements = useQuantum((s) => s.placements);
  const step = useQuantum((s) => s.step);

  const n = Math.max(1, numQubits);
  const state = currentState({ numQubits: n, placements, step });

  return (
    <div className="flex flex-col gap-2 text-ink">
      <div className="mb-1 flex items-center justify-between gap-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-widest text-vermilion-300/80">Q-sphere</h3>
        <div className="flex items-center gap-2 font-mono text-[10px] text-graphite">
          fase:
          {LEGEND.map((l) => (
            <span key={l.label} className="flex items-center gap-1">
              <span
                className="inline-block h-2.5 w-2.5 rounded-sm ring-1 ring-white/10"
                style={{ background: swatch(l.phase) }}
              />
              {l.label}
            </span>
          ))}
        </div>
      </div>

      <div className="relative h-72 overflow-hidden rounded-lg border border-line/60 bg-black/40">
        <QSphere state={state} n={n} />
      </div>

      <p className="rounded-lg border border-line bg-void-soft/40 px-3 py-2 text-[11px] leading-relaxed text-graphite">
        Cada nodo es un estado base. <span className="text-ink">Radio del nodo</span> = probabilidad
        (|α|²), <span className="text-ink">color</span> = fase (rueda de color) y{" "}
        <span className="text-ink">latitud</span> = nº de unos: |0…0⟩ en el polo norte, |1…1⟩ en el
        polo sur. Arrastra para girar, rueda para acercar.
      </p>
    </div>
  );
}
