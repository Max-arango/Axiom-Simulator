// Composite gates (reusable subcircuits) for the Quantum Lab. A composite is a
// named subcircuit defined over LOCAL qubits 0..qubits-1. It is not a primitive:
// inserting it EXPANDS to primitive ops remapped onto physical qubits, so the
// engine never sees composites — zero engine change. Build blocks like QFT, adders
// or oracles once and stamp them anywhere.
import type { Operation } from "./types.ts";

export interface CompositeDef {
  id: string;
  name: string;
  qubits: number; // arity (number of local qubits it acts on)
  ops: Operation[]; // defined over local qubit indices 0..qubits-1
  builtin?: boolean; // built-ins can't be deleted
}

/** Remap a composite's ops from local qubits onto physical qubits (local q → base + q). */
export function expandComposite(def: CompositeDef, base: number): Operation[] {
  const shift = (q: number) => q + base;
  return def.ops.map((op) => {
    const out: Operation = { gate: op.gate, qubits: op.qubits.map(shift) };
    if (op.params) out.params = { ...op.params };
    if (op.openControls && op.openControls.length) out.openControls = op.openControls.map(shift);
    if (op.clbit !== undefined) out.clbit = op.clbit + base;
    if (op.condition) out.condition = { clbit: op.condition.clbit + base, value: op.condition.value };
    return out;
  });
}

/** Textbook Quantum Fourier Transform on local qubits 0..nq-1 (with final reversal swaps). */
export function qftOps(nq: number): Operation[] {
  const ops: Operation[] = [];
  for (let j = 0; j < nq; j++) {
    ops.push({ gate: "H", qubits: [j] });
    for (let k = j + 1; k < nq; k++) {
      ops.push({ gate: "CP", qubits: [k, j], params: { theta: Math.PI / (1 << (k - j)) } });
    }
  }
  for (let i = 0; i < Math.floor(nq / 2); i++) {
    ops.push({ gate: "SWAP", qubits: [i, nq - 1 - i] });
  }
  return ops;
}

export const BUILTIN_COMPOSITES: CompositeDef[] = [
  { id: "bell", name: "Bell", qubits: 2, builtin: true, ops: [{ gate: "H", qubits: [0] }, { gate: "CX", qubits: [0, 1] }] },
  {
    id: "ghz3", name: "GHZ-3", qubits: 3, builtin: true,
    ops: [{ gate: "H", qubits: [0] }, { gate: "CX", qubits: [0, 1] }, { gate: "CX", qubits: [1, 2] }],
  },
  { id: "qft2", name: "QFT-2", qubits: 2, builtin: true, ops: qftOps(2) },
  { id: "qft3", name: "QFT-3", qubits: 3, builtin: true, ops: qftOps(3) },
];
