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

export type GateId =
  | "I" | "X" | "Y" | "Z" | "H" | "S" | "Sdg" | "T" | "Tdg"
  | "RX" | "RY" | "RZ" | "PHASE"
  | "CX" | "CZ" | "SWAP" | "CCX" | "M";

export interface GateParams {
  theta?: number;
  phi?: number;
}

/** One gate application. For controlled gates: qubits = [...controls, target] (target LAST). */
export interface Operation {
  gate: GateId;
  qubits: number[];
  params?: GateParams;
}

export interface Circuit {
  qubits: number;
  ops: Operation[];
}

/** Statevector sim is exponential in qubit count; cap it. */
export const MAX_QUBITS = 6;
