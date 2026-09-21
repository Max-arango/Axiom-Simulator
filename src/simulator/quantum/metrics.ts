// Static circuit metrics for the Quantum Lab: pure counting + ASAP layering, no
// engine run. `depth` is the critical-path length via the same greedy scheduling
// loadCircuit uses; barriers count as a layer like any other op.

import { GATES } from "./gates.ts";
import type { Circuit } from "./types.ts";

export interface CircuitMetrics {
  depth: number;
  width: number;
  gateCount: number;
  twoQubitCount: number;
  measurements: number;
  byGate: Record<string, number>;
}

export function circuitMetrics(circuit: Circuit): CircuitMetrics {
  const width = circuit.qubits;
  const lastUsed = new Array(Math.max(0, width)).fill(0); // next free column per qubit
  let gateCount = 0;
  let twoQubitCount = 0;
  let measurements = 0;
  const byGate: Record<string, number> = {};

  for (const op of circuit.ops) {
    const kind = GATES[op.gate]?.kind;

    // ASAP: place at the first column after every qubit it touches is free.
    let col = 0;
    for (const q of op.qubits) if (q >= 0 && q < width && lastUsed[q] > col) col = lastUsed[q];
    for (const q of op.qubits) if (q >= 0 && q < width) lastUsed[q] = col + 1;

    byGate[op.gate] = (byGate[op.gate] ?? 0) + 1;
    if (kind === "measure") measurements++;
    else if (kind !== "barrier") {
      gateCount++;
      if (op.qubits.length >= 2) twoQubitCount++;
    }
  }

  const depth = lastUsed.length ? Math.max(...lastUsed) : 0;
  return { depth, width, gateCount, twoQubitCount, measurements, byGate };
}
