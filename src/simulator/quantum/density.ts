// Single-qubit reduced density matrices and the entanglement metrics that fall
// out of them. Little-endian: qubit i = bit i of the basis index (see types.ts).
//
// The reduced density matrix of one qubit is its partial trace over all the
// others: ρ[a][b] = Σ_env ψ(qubit=a, env)·conj(ψ(qubit=b, env)), env ranging
// over every assignment of the remaining n−1 qubits. A single pass over the
// 2^n amplitudes accumulates all four entries (n≤6 ⇒ ≤64, so brute force is fine).

import { abs, add, C, conj, mul, type Complex } from "../mathlab/complex/complex.ts";
import { MAX_QUBITS, type StateVector } from "./types.ts";

/** 2×2 reduced density matrix, row-major. Hermitian, trace 1. */
export type Density2 = [[Complex, Complex], [Complex, Complex]];

function assertQubit(qubit: number, n: number, state: StateVector): void {
  if (!Number.isInteger(n) || n < 1) throw new Error(`qubit count must be a positive integer, got ${n}`);
  if (n > MAX_QUBITS) throw new Error(`qubit count ${n} exceeds MAX_QUBITS=${MAX_QUBITS}`);
  if (!Number.isInteger(qubit) || qubit < 0 || qubit >= n) throw new Error(`qubit ${qubit} out of range [0,${n})`);
  if (state.length !== 1 << n) throw new Error(`state length ${state.length} != 2^${n}`);
}

/** Partial trace over every qubit except `qubit`. */
export function reducedDensity(state: StateVector, qubit: number, n: number): Density2 {
  assertQubit(qubit, n, state);
  const bit = 1 << qubit;
  const dim = 1 << n;
  const rho: Density2 = [[C(0), C(0)], [C(0), C(0)]];
  for (let i = 0; i < dim; i++) {
    const a = (i >> qubit) & 1;
    const env = i & ~bit; // this index with the target bit cleared
    for (let b = 0; b < 2; b++) {
      const j = env | (b << qubit); // partner sharing the same env, target bit = b
      rho[a][b] = add(rho[a][b], mul(state[i], conj(state[j])));
    }
  }
  return rho;
}

/** Bloch vector from ρ = ½(I + x·σx + y·σy + z·σz). Note y = −2·Im(ρ01). */
export function blochVector(rho: Density2): [number, number, number] {
  const x = 2 * rho[0][1].re;
  const y = -2 * rho[0][1].im;
  const z = rho[0][0].re - rho[1][1].re;
  return [x, y, z];
}

/** Tr(ρ²), real. Pure = 1, maximally mixed = 0.5. Hermitian ⇒ Σ_ij |ρ_ij|². */
export function purity(rho: Density2): number {
  let s = 0;
  for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) s += abs(rho[i][j]) ** 2;
  return s;
}

/** Entanglement entropy (this qubit vs the rest) in bits. Eigenvalues (1±r)/2. */
export function vonNeumannEntropy(rho: Density2): number {
  const [x, y, z] = blochVector(rho);
  const r = Math.sqrt(x * x + y * y + z * z);
  const term = (lambda: number): number => (lambda <= 0 ? 0 : -lambda * Math.log2(lambda)); // 0·log0 = 0
  return term((1 + r) / 2) + term((1 - r) / 2);
}

/** True when the qubit's reduced state is mixed, i.e. entangled with the rest. */
export function isEntangled(state: StateVector, qubit: number, n: number, tol = 1e-9): boolean {
  return purity(reducedDensity(state, qubit, n)) < 1 - tol;
}

/** Bloch vector of a qubit straight from the full state. */
export function blochOf(state: StateVector, qubit: number, n: number): [number, number, number] {
  return blochVector(reducedDensity(state, qubit, n));
}
