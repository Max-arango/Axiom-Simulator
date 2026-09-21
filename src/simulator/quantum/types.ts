// Core types for the quantum circuit simulator engine. Pure data, no behavior.
//
// Qubit ↔ bit mapping is LITTLE-ENDIAN, fixed once here and honored everywhere:
//   qubit i occupies bit i of a basis-state index, i.e. bit value = (index >> i) & 1.
//   qubit 0 is the least-significant bit. So for 2 qubits the amplitude order is
//   index 0=|q1=0,q0=0⟩, 1=|q1=0,q0=1⟩, 2=|q1=1,q0=0⟩, 3=|q1=1,q0=1⟩.

import type { Complex } from "../mathlab/complex/complex.ts";

/** Dense state vector of length 2^n; index = basis state (little-endian, see above). */
export type StateVector = Complex[];

/** A 2×2 complex matrix, row-major: [[m00, m01], [m10, m11]]. */
export type Mat2 = [[Complex, Complex], [Complex, Complex]];

/** A 4×4 complex matrix (two-qubit gate), row-major. Sub-index = qA + 2·qB. */
export type Mat4 = Complex[][];

export type GateId =
  | "I" | "X" | "Y" | "Z" | "H" | "S" | "Sdg" | "T" | "Tdg" | "SX" | "SXdg"
  | "RX" | "RY" | "RZ" | "PHASE" | "U3"
  | "CX" | "CZ" | "CCX" | "CP" | "CRX" | "CRY" | "CRZ"
  | "SWAP" | "ISWAP" | "RXX" | "RYY" | "RZZ"
  | "BARRIER" | "RESET" | "M";

export interface GateParams {
  theta?: number;
  phi?: number;
  lambda?: number;
}

/**
 * One gate application. For controlled gates: qubits = [...controls, target]
 * (target LAST). `openControls` lists control qubit indices that trigger on |0⟩
 * (anti-controls, drawn ○); absent → all controls trigger on |1⟩.
 */
export interface Operation {
  gate: GateId;
  qubits: number[];
  params?: GateParams;
  openControls?: number[];
  /** For M: classical bit index to write the outcome to (defaults to the measured qubit). */
  clbit?: number;
  /** Classical conditional (c_if): apply this op only if classical bit `clbit` === `value`. */
  condition?: { clbit: number; value: 0 | 1 };
}

export interface Circuit {
  qubits: number;
  ops: Operation[];
  /** Size of the classical register (defaults to `qubits`). */
  clbits?: number;
}

/** Statevector sim is exponential in qubit count (2^n amplitudes); cap it.
 * 8 → 256 amplitudes: comfortable in-browser. Going much higher blows up memory
 * and the per-qubit Bloch grid's WebGL context count. */
export const MAX_QUBITS = 8;
