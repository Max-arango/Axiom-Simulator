// Statevector evolution. Little-endian: qubit i = bit i of the basis index
// (value = (index >> i) & 1), qubit 0 = least-significant bit. Every function
// returns a NEW array; inputs are never mutated. Amplitudes are shared by
// reference where untouched — safe because we overwrite slots, never mutate them.
//
// noUncheckedIndexedAccess is OFF in this repo, so indices are guarded by hand.

import { C, add, mul, scale } from "../mathlab/complex/complex.ts";
import { GATES, gateMatrix } from "./gates.ts";
import { MAX_QUBITS, type Mat2, type Operation, type StateVector } from "./types.ts";

function assertN(n: number): void {
  if (!Number.isInteger(n) || n < 1) throw new Error(`qubit count must be a positive integer, got ${n}`);
  if (n > MAX_QUBITS) throw new Error(`qubit count ${n} exceeds MAX_QUBITS=${MAX_QUBITS}`);
}

function assertIndex(q: number, n: number, role: string): void {
  if (!Number.isInteger(q) || q < 0 || q >= n) throw new Error(`${role} qubit ${q} out of range [0,${n})`);
}

/** |0…0⟩ for n qubits: amplitude 1 at index 0, else 0. */
export function zeroState(n: number): StateVector {
  assertN(n);
  const dim = 1 << n;
  const s: StateVector = new Array(dim);
  for (let i = 0; i < dim; i++) s[i] = C(0);
  s[0] = C(1);
  return s;
}

/** Apply a 2×2 matrix to `target` across every basis pair differing only in that bit. */
export function applyMat2(state: StateVector, m: Mat2, target: number, n: number): StateVector {
  assertN(n);
  assertIndex(target, n, "target");
  const dim = 1 << n;
  const out = state.slice();
  const bit = 1 << target;
  for (let i = 0; i < dim; i++) {
    if ((i & bit) !== 0) continue; // process each pair once, from its target=0 member
    const j = i | bit;
    const a0 = state[i], a1 = state[j];
    out[i] = add(mul(m[0][0], a0), mul(m[0][1], a1));
    out[j] = add(mul(m[1][0], a0), mul(m[1][1], a1));
  }
  return out;
}

/** Apply `m` to `target` only in basis states where ALL control bits are 1. */
export function applyControlled(
  state: StateVector, m: Mat2, controls: number[], target: number, n: number,
): StateVector {
  assertN(n);
  assertIndex(target, n, "target");
  let mask = 0;
  for (const c of controls) {
    assertIndex(c, n, "control");
    if (c === target) throw new Error(`control qubit ${c} coincides with target`);
    mask |= 1 << c;
  }
  const dim = 1 << n;
  const out = state.slice();
  const bit = 1 << target;
  for (let i = 0; i < dim; i++) {
    if ((i & bit) !== 0) continue;
    if ((i & mask) !== mask) continue; // not all controls set → leave pair untouched
    const j = i | bit;
    const a0 = state[i], a1 = state[j];
    out[i] = add(mul(m[0][0], a0), mul(m[0][1], a1));
    out[j] = add(mul(m[1][0], a0), mul(m[1][1], a1));
  }
  return out;
}

/** Swap qubits a and b by permuting amplitudes. */
export function applySwap(state: StateVector, a: number, b: number, n: number): StateVector {
  assertN(n);
  assertIndex(a, n, "swap-a");
  assertIndex(b, n, "swap-b");
  const dim = 1 << n;
  const out = state.slice();
  if (a === b) return out;
  const ba = 1 << a, bb = 1 << b;
  for (let i = 0; i < dim; i++) {
    const va = (i & ba) !== 0, vb = (i & bb) !== 0;
    if (va === vb) continue; // bits equal → amplitude stays put
    const j = (i ^ ba) ^ bb; // flip both bits
    out[i] = state[j];
  }
  return out;
}

/** Dispatch one operation by its gate kind. Measurement is a NO-OP here. */
export function applyOperation(state: StateVector, op: Operation, n: number): StateVector {
  const spec = GATES[op.gate];
  switch (spec.kind) {
    case "single":
      return applyMat2(state, gateMatrix(op.gate, op.params), op.qubits[0], n);
    case "controlled": {
      const target = op.qubits[op.qubits.length - 1];
      const controls = op.qubits.slice(0, -1);
      return applyControlled(state, gateMatrix(op.gate, op.params), controls, target, n);
    }
    case "swap":
      return applySwap(state, op.qubits[0], op.qubits[1], n);
    case "measure":
      return state; // collapse handled in a later module
  }
}

/** |amp|² per basis state. */
export function probabilities(state: StateVector): number[] {
  return state.map((z) => z.re * z.re + z.im * z.im);
}

/** Σ|amp|². */
export function norm2(state: StateVector): number {
  let s = 0;
  for (const z of state) s += z.re * z.re + z.im * z.im;
  return s;
}

/** Divide by √norm2; if the norm is ~0, return the state unchanged (copied). */
export function normalize(state: StateVector): StateVector {
  const nrm = Math.sqrt(norm2(state));
  if (nrm < 1e-15) return state.slice();
  const inv = 1 / nrm;
  return state.map((z) => scale(z, inv));
}
