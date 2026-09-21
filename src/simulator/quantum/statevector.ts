// Statevector evolution. Little-endian: qubit i = bit i of the basis index
// (value = (index >> i) & 1), qubit 0 = least-significant bit. Every function
// returns a NEW array; inputs are never mutated. Amplitudes are shared by
// reference where untouched — safe because we overwrite slots, never mutate them.
//
// noUncheckedIndexedAccess is OFF in this repo, so indices are guarded by hand.

import { C, add, mul, scale } from "../mathlab/complex/complex.ts";
import { GATES, gateMatrix, gateMatrix4 } from "./gates.ts";
import { MAX_QUBITS, type Mat2, type Mat4, type Operation, type StateVector } from "./types.ts";

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

/**
 * Apply `m` to `target` only where the controls fire. Controls in `open` fire on
 * |0⟩ (anti-controls); all others fire on |1⟩.
 */
export function applyControlled(
  state: StateVector, m: Mat2, controls: number[], target: number, n: number, open: number[] = [],
): StateVector {
  assertN(n);
  assertIndex(target, n, "target");
  let onMask = 0; // these control bits must be 1
  let offMask = 0; // these control bits must be 0 (anti-controls)
  for (const c of controls) {
    assertIndex(c, n, "control");
    if (c === target) throw new Error(`control qubit ${c} coincides with target`);
    if (open.includes(c)) offMask |= 1 << c;
    else onMask |= 1 << c;
  }
  const dim = 1 << n;
  const out = state.slice();
  const bit = 1 << target;
  for (let i = 0; i < dim; i++) {
    if ((i & bit) !== 0) continue;
    if ((i & onMask) !== onMask) continue; // some |1⟩-control not set
    if ((i & offMask) !== 0) continue; // some |0⟩-control (anti) is set
    const j = i | bit;
    const a0 = state[i], a1 = state[j];
    out[i] = add(mul(m[0][0], a0), mul(m[0][1], a1));
    out[j] = add(mul(m[1][0], a0), mul(m[1][1], a1));
  }
  return out;
}

/** Apply a 4×4 matrix to the two-qubit subspace (qA, qB). Sub-index = qA + 2·qB. */
export function applyTwoQubit(
  state: StateVector, m: Mat4, qA: number, qB: number, n: number,
): StateVector {
  assertN(n);
  assertIndex(qA, n, "qA");
  assertIndex(qB, n, "qB");
  if (qA === qB) throw new Error(`two-qubit gate needs distinct qubits, got ${qA},${qB}`);
  const dim = 1 << n;
  const out = state.slice();
  const ba = 1 << qA, bb = 1 << qB;
  for (let i = 0; i < dim; i++) {
    if ((i & ba) !== 0 || (i & bb) !== 0) continue; // process each quad once, from its 00 member
    const idx = [i, i | ba, i | bb, i | ba | bb]; // sub-index 0..3 = qA + 2·qB
    const a = [state[idx[0]], state[idx[1]], state[idx[2]], state[idx[3]]];
    for (let r = 0; r < 4; r++) {
      let acc = C(0);
      for (let k = 0; k < 4; k++) acc = add(acc, mul(m[r][k], a[k]));
      out[idx[r]] = acc;
    }
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
      return applyControlled(state, gateMatrix(op.gate, op.params), controls, target, n, op.openControls ?? []);
    }
    case "swap":
      return applySwap(state, op.qubits[0], op.qubits[1], n);
    case "two":
      return applyTwoQubit(state, gateMatrix4(op.gate, op.params), op.qubits[0], op.qubits[1], n);
    case "barrier":
      return state; // visual only, no evolution
    case "reset":
      return state; // stochastic (measure + conditional-X) — handled by the trajectory runner
    case "measure":
      return state; // collapse handled in the trajectory runner / shots
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
