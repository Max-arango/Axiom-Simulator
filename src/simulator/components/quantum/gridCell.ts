// Pure grid-cell classification for the interactive circuit editor. No React.
// Given the flat PlacedOp[] and a (qubit, column) coordinate, decide what that
// cell should draw. Multi-qubit convention (from quantumStore/types): the LAST
// qubit is the target, the rest are controls.
//
// Only the PlacedOp TYPE is pulled from quantumStore (erased at runtime), so this
// stays a light, dependency-free logic module — the cell lookup is a one-liner, no
// need to import the whole store just to reuse placementAt().

import type { PlacedOp } from "../../quantum/quantumStore.ts";
import { GATES } from "../../quantum/gates.ts";

export type CellRole =
  | { kind: "empty" }
  | { kind: "single"; op: PlacedOp }
  | { kind: "control"; op: PlacedOp }
  | { kind: "anticontrol"; op: PlacedOp }
  | { kind: "target"; op: PlacedOp }
  | { kind: "swap"; op: PlacedOp }
  | { kind: "two"; op: PlacedOp }
  | { kind: "barrier"; op: PlacedOp }
  | { kind: "measure"; op: PlacedOp };

/** Classify this qubit's role within whatever op (if any) covers (qubit, column). */
export function cellRole(placements: PlacedOp[], qubit: number, column: number): CellRole {
  const op = placements.find((p) => p.column === column && p.qubits.includes(qubit));
  if (!op) return { kind: "empty" };
  const spec = GATES[op.gate];
  if (spec.kind === "measure") return { kind: "measure", op };
  if (spec.kind === "barrier") return { kind: "barrier", op };
  if (spec.kind === "swap") return { kind: "swap", op };
  if (spec.kind === "two") return { kind: "two", op }; // both qubits show the gate box
  if (spec.kind === "controlled") {
    const target = op.qubits[op.qubits.length - 1];
    if (qubit === target) return { kind: "target", op };
    return op.openControls?.includes(qubit) ? { kind: "anticontrol", op } : { kind: "control", op };
  }
  return { kind: "single", op }; // arity-1 unitary
}

/** Min/max qubit index of an op — for drawing the vertical connector of multi-qubit ops. */
export function columnSpan(op: PlacedOp): { min: number; max: number } {
  if (op.qubits.length === 0) return { min: 0, max: 0 };
  return { min: Math.min(...op.qubits), max: Math.max(...op.qubits) };
}
