// Expectation values (observables) for the Quantum Lab. Pure: no React, no store.
//
// A tensor-product Pauli string P = P_{n-1} ⊗ … ⊗ P_0 acts one qubit at a time:
// paulis[q] is the Pauli on qubit q (little-endian, qubit 0 = LSB), "I" = identity.
// ⟨P⟩ = ⟨ψ|P|ψ⟩ is real for Hermitian P; we compute |Pψ⟩ then Re(Σ conj(ψ_i)·(Pψ)_i)
// and return the real part (the imaginary part is ~0 up to float error).

import { C, add, mul, conj } from "../mathlab/complex/complex.ts";
import { gateMatrix } from "./gates.ts";
import { applyMat2 } from "./statevector.ts";
import type { StateVector } from "./types.ts";

export type Pauli = "I" | "X" | "Y" | "Z";

/** ⟨ψ|P|ψ⟩ for the Pauli string P (paulis[q] on qubit q). Real result. */
export function expectationPauli(state: StateVector, paulis: Pauli[], n: number): number {
  if (!Number.isInteger(n) || n < 1 || n > 6) throw new Error(`qubit count must be an integer in [1,6], got ${n}`);
  if (paulis.length !== n) throw new Error(`paulis length ${paulis.length} must equal n=${n}`);

  // |Pψ⟩: apply each non-identity single-qubit Pauli to a working copy.
  let p = state;
  for (let q = 0; q < n; q++) {
    if (paulis[q] === "I") continue;
    p = applyMat2(p, gateMatrix(paulis[q]), q, n);
  }

  // ⟨ψ|Pψ⟩ = Σ conj(ψ_i)·(Pψ)_i; return the (real) real part.
  let acc = C(0);
  for (let i = 0; i < state.length; i++) acc = add(acc, mul(conj(state[i]), p[i]));
  return acc.re;
}

/** Pauli string with `p` on qubit `q` and "I" everywhere else (length n). */
export function axis(p: Pauli, q: number, n: number): Pauli[] {
  const arr: Pauli[] = new Array(n).fill("I");
  arr[q] = p;
  return arr;
}

export const expectX = (s: StateVector, q: number, n: number): number => expectationPauli(s, axis("X", q, n), n);
export const expectY = (s: StateVector, q: number, n: number): number => expectationPauli(s, axis("Y", q, n), n);
export const expectZ = (s: StateVector, q: number, n: number): number => expectationPauli(s, axis("Z", q, n), n);

/** ⟨Z_a Z_b⟩ correlation. For a===b this is ⟨Z_a⟩ (Z·Z=I is not applied here). */
export function expectZZ(state: StateVector, a: number, b: number, n: number): number {
  const paulis: Pauli[] = new Array(n).fill("I");
  paulis[a] = "Z";
  paulis[b] = "Z";
  return expectationPauli(state, paulis, n);
}
