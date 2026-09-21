// Compact static-metrics readout for the current circuit.
import { useQuantum, toCircuit } from "../../quantum/quantumStore.ts";
import { circuitMetrics } from "../../quantum/metrics.ts";

export function MetricsBar() {
  const numQubits = useQuantum((s) => s.numQubits);
  const placements = useQuantum((s) => s.placements);
  const m = circuitMetrics(toCircuit({ numQubits, placements }));

  const item = (label: string, value: number) => (
    <span className="text-graphite">
      {label} <span className="text-ink tabular-nums">{value}</span>
    </span>
  );

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px]">
      {item("Profundidad", m.depth)}
      {item("Puertas", m.gateCount)}
      {item("Ancho", m.width)}
      {item("2-qubit", m.twoQubitCount)}
      {item("Mediciones", m.measurements)}
    </div>
  );
}
