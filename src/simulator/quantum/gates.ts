// Gate matrices and registry. All 2×2 matrices are row-major [[m00,m01],[m10,m11]].
// Controlled ops store only their base single-qubit matrix (the op the target sees
// when every control is |1⟩); the statevector layer supplies the control logic.
// Convention for controlled ops: qubits = [...controls, target] — target is LAST.

import { C, exp } from "../mathlab/complex/complex.ts";
import type { GateId, GateParams, Mat2 } from "./types.ts";

const R2 = Math.SQRT1_2; // 1/√2

// --- static single-qubit matrices ---
const I: Mat2 = [[C(1), C(0)], [C(0), C(1)]];
const X: Mat2 = [[C(0), C(1)], [C(1), C(0)]];
const Y: Mat2 = [[C(0), C(0, -1)], [C(0, 1), C(0)]];
const Z: Mat2 = [[C(1), C(0)], [C(0), C(-1)]];
const H: Mat2 = [[C(R2), C(R2)], [C(R2), C(-R2)]];
const S: Mat2 = [[C(1), C(0)], [C(0), C(0, 1)]];
const Sdg: Mat2 = [[C(1), C(0)], [C(0), C(0, -1)]];
const T: Mat2 = [[C(1), C(0)], [C(0), exp(C(0, Math.PI / 4))]]; // e^{iπ/4}
const Tdg: Mat2 = [[C(1), C(0)], [C(0), exp(C(0, -Math.PI / 4))]];

// --- parametric single-qubit generators (θ applied as θ/2 where standard) ---
const RX = (p?: GateParams): Mat2 => {
  const t = (p?.theta ?? 0) / 2, c = Math.cos(t), s = Math.sin(t);
  return [[C(c), C(0, -s)], [C(0, -s), C(c)]];
};
const RY = (p?: GateParams): Mat2 => {
  const t = (p?.theta ?? 0) / 2, c = Math.cos(t), s = Math.sin(t);
  return [[C(c), C(-s)], [C(s), C(c)]];
};
const RZ = (p?: GateParams): Mat2 => {
  const t = (p?.theta ?? 0) / 2;
  return [[C(Math.cos(t), -Math.sin(t)), C(0)], [C(0), C(Math.cos(t), Math.sin(t))]];
};
const PHASE = (p?: GateParams): Mat2 => {
  const f = p?.phi ?? 0;
  return [[C(1), C(0)], [C(0), C(Math.cos(f), Math.sin(f))]];
};

const konst = (m: Mat2) => (): Mat2 => m; // static matrices ignore params

export interface GateSpec {
  id: GateId;
  label: string;
  arity: number;
  params: ("theta" | "phi")[];
  kind: "single" | "controlled" | "swap" | "measure";
  matrix?: (p?: GateParams) => Mat2;
}

export const GATES: Record<GateId, GateSpec> = {
  I: { id: "I", label: "Identity", arity: 1, params: [], kind: "single", matrix: konst(I) },
  X: { id: "X", label: "Pauli-X", arity: 1, params: [], kind: "single", matrix: konst(X) },
  Y: { id: "Y", label: "Pauli-Y", arity: 1, params: [], kind: "single", matrix: konst(Y) },
  Z: { id: "Z", label: "Pauli-Z", arity: 1, params: [], kind: "single", matrix: konst(Z) },
  H: { id: "H", label: "Hadamard", arity: 1, params: [], kind: "single", matrix: konst(H) },
  S: { id: "S", label: "Phase S", arity: 1, params: [], kind: "single", matrix: konst(S) },
  Sdg: { id: "Sdg", label: "S†", arity: 1, params: [], kind: "single", matrix: konst(Sdg) },
  T: { id: "T", label: "T", arity: 1, params: [], kind: "single", matrix: konst(T) },
  Tdg: { id: "Tdg", label: "T†", arity: 1, params: [], kind: "single", matrix: konst(Tdg) },
  RX: { id: "RX", label: "RX(θ)", arity: 1, params: ["theta"], kind: "single", matrix: RX },
  RY: { id: "RY", label: "RY(θ)", arity: 1, params: ["theta"], kind: "single", matrix: RY },
  RZ: { id: "RZ", label: "RZ(θ)", arity: 1, params: ["theta"], kind: "single", matrix: RZ },
  PHASE: { id: "PHASE", label: "Phase(φ)", arity: 1, params: ["phi"], kind: "single", matrix: PHASE },
  // controlled: matrix is the base op applied to the target when all controls = |1⟩
  CX: { id: "CX", label: "CNOT", arity: 2, params: [], kind: "controlled", matrix: konst(X) },
  CZ: { id: "CZ", label: "CZ", arity: 2, params: [], kind: "controlled", matrix: konst(Z) },
  CCX: { id: "CCX", label: "Toffoli", arity: 3, params: [], kind: "controlled", matrix: konst(X) },
  SWAP: { id: "SWAP", label: "SWAP", arity: 2, params: [], kind: "swap" },
  M: { id: "M", label: "Measure", arity: 1, params: [], kind: "measure" },
};

/** Base 2×2 matrix for a single or controlled gate. Throws for swap/measure. */
export function gateMatrix(id: GateId, params?: GateParams): Mat2 {
  const spec = GATES[id];
  if (!spec.matrix) throw new Error(`gate ${id} has no matrix (kind=${spec.kind})`);
  return spec.matrix(params);
}
