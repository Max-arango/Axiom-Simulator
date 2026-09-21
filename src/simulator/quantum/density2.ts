// Two-qubit reduced density matrices and the correlation metric that falls out of
// them: quantum mutual information I(A:B) = S(A) + S(B) − S(AB). Little-endian:
// qubit i = bit i of the basis index (see types.ts).
//
// The two-qubit reduced density matrix is the partial trace over every OTHER qubit:
// ρ[r][c] = Σ_env ψ((qA,qB)=r, env)·conj(ψ((qA,qB)=c, env)), env ranging over every
// assignment of the remaining n−2 qubits. Sub-index bit0 = qA (low), bit1 = qB.

import { abs, add, C, conj, mul, type Complex } from "../mathlab/complex/complex.ts";
import { eigSymmetric } from "../mathlab/linear/eigen.ts";
import { make } from "../mathlab/linear/matrix.ts";
import { reducedDensity, vonNeumannEntropy } from "./density.ts";
import { MAX_QUBITS, type StateVector } from "./types.ts";

/** 4×4 reduced density matrix, row-major. Sub-index = qA + 2·qB (qA is the low bit). */
export type Density4 = Complex[][];

function assertPair(qA: number, qB: number, n: number, state: StateVector): void {
  if (!Number.isInteger(n) || n < 1) throw new Error(`qubit count must be a positive integer, got ${n}`);
  if (n > MAX_QUBITS) throw new Error(`qubit count ${n} exceeds MAX_QUBITS=${MAX_QUBITS}`);
  for (const [q, role] of [[qA, "qA"], [qB, "qB"]] as const) {
    if (!Number.isInteger(q) || q < 0 || q >= n) throw new Error(`${role} ${q} out of range [0,${n})`);
  }
  if (qA === qB) throw new Error(`reducedDensity2 needs distinct qubits, got ${qA},${qB}`);
  if (state.length !== 1 << n) throw new Error(`state length ${state.length} != 2^${n}`);
}

/** Partial trace over every qubit except qA (low bit) and qB (high bit). */
export function reducedDensity2(state: StateVector, qA: number, qB: number, n: number): Density4 {
  assertPair(qA, qB, n, state);
  const bitA = 1 << qA;
  const bitB = 1 << qB;
  const dim = 1 << n;
  const rho: Density4 = Array.from({ length: 4 }, () => [C(0), C(0), C(0), C(0)]);
  for (let i = 0; i < dim; i++) {
    const r = ((i >> qA) & 1) | (((i >> qB) & 1) << 1);
    const env = i & ~bitA & ~bitB; // this index with both target bits cleared
    for (let c = 0; c < 4; c++) {
      const j = env | ((c & 1) << qA) | (((c >> 1) & 1) << qB); // same env, (qA,qB) = c-bits
      rho[r][c] = add(rho[r][c], mul(state[i], conj(state[j])));
    }
  }
  return rho;
}

/**
 * Von Neumann entropy (bits) of a 4×4 Hermitian trace-1 ρ. Real-embeds ρ = A + iB as the
 * 8×8 real SYMMETRIC matrix M = [[A, −B], [B, A]] (A = Re ρ, B = Im ρ); M's 8 eigenvalues
 * are ρ's 4 eigenvalues each doubled, so S = −½·Σ_k λ_k·log2(λ_k). λ ≤ 1e-12 contributes 0.
 */
export function entropy4(rho: Density4): number {
  const M: number[][] = Array.from({ length: 8 }, () => new Array<number>(8).fill(0));
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const a = rho[r][c].re; // A = Re ρ
      const b = rho[r][c].im; // B = Im ρ
      M[r][c] = a;         // top-left  A
      M[r + 4][c + 4] = a; // bottom-right A
      M[r][c + 4] = -b;    // top-right  −B
      M[r + 4][c] = b;     // bottom-left B
    }
  }
  const eig = eigSymmetric(make(M));
  if (eig === null) throw new Error("entropy4: symmetric eigensolver failed to converge");
  let s = 0;
  for (const lambda of eig.values) {
    if (lambda > 1e-12) s += lambda * Math.log2(lambda); // λ ≤ 1e-12 (incl. tiny negatives) → 0
  }
  return -0.5 * s;
}

/** Quantum mutual information I(A:B) = S(A) + S(B) − S(AB), in bits. Clamped to ≥ 0. */
export function mutualInformation(state: StateVector, qA: number, qB: number, n: number): number {
  const sA = vonNeumannEntropy(reducedDensity(state, qA, n));
  const sB = vonNeumannEntropy(reducedDensity(state, qB, n));
  const sAB = entropy4(reducedDensity2(state, qA, qB, n));
  return Math.max(0, sA + sB - sAB);
}

/** n×n symmetric matrix of pairwise mutual information; diagonal 0. */
export function mutualInfoMatrix(state: StateVector, n: number): number[][] {
  const m: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const info = mutualInformation(state, i, j, n);
      m[i][j] = info;
      m[j][i] = info;
    }
  }
  return m;
}

/** Element-wise magnitude |ρ_AB| of a 4×4 density matrix (for a heatmap). */
export function magnitude4(rho: Density4): number[][] {
  return rho.map((row) => row.map((z) => abs(z)));
}
