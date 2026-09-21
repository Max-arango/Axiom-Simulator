// Per-qubit phase disks (IBM Composer style): for each qubit, its population of
// |1⟩ and the local relative phase, both read off its reduced density matrix ρ.
//
//   p1     = ρ11 = P(|1⟩) for this qubit alone.
//   phase  = arg of the off-diagonal ρ10 = the |1⟩ amplitude's phase relative to
//            |0⟩. This equals the Bloch azimuth φ = atan2(y,x) (y=−2·Im ρ01,
//            x=2·Re ρ01), so |i⟩ → +π/2, |−⟩ → π, |+⟩ → 0. Zero when the qubit
//            is (near) diagonal — no coherence, no defined phase.
//   purity = Tr(ρ²) = Σ|ρ_ij|². 1 = pure, 0.5 = maximally mixed (entangled).
//
// Little-endian: qubit i = bit i. Index/n guarding is delegated to reducedDensity.

import { abs, arg } from "../mathlab/complex/complex.ts";
import { reducedDensity } from "./density.ts";
import type { StateVector } from "./types.ts";

export interface PhaseDisk {
  qubit: number;
  p1: number;
  phase: number;
  purity: number;
}

/** Phase disk for one qubit, from its single-qubit reduced density matrix. */
export function phaseDisk(state: StateVector, qubit: number, n: number): PhaseDisk {
  const rho = reducedDensity(state, qubit, n); // guards qubit/n/state length
  const off = rho[1][0]; // ρ10 = ψ1·conj(ψ0): phase of |1⟩ relative to |0⟩
  const phase = abs(off) < 1e-12 ? 0 : arg(off);
  let purity = 0;
  for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) purity += abs(rho[i][j]) ** 2;
  return { qubit, p1: rho[1][1].re, phase, purity };
}

/** Phase disks for every qubit, in index order. */
export function phaseDisks(state: StateVector, n: number): PhaseDisk[] {
  const out: PhaseDisk[] = [];
  for (let q = 0; q < n; q++) out.push(phaseDisk(state, q, n));
  return out;
}
