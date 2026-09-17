// Per-qubit entanglement report derived from single-qubit reduced density
// matrices. Pure: no React, no store. One reducedDensity pass per qubit feeds
// every metric (see ../../quantum/density.ts).

import { blochOf, reducedDensity, purity, vonNeumannEntropy, isEntangled } from "../../quantum/density.ts";
import type { StateVector } from "../../quantum/types.ts";

export interface QubitEnt {
  qubit: number;
  bloch: [number, number, number];
  r: number;
  purity: number;
  entropy: number;
  entangled: boolean;
}

/** One QubitEnt per qubit: Bloch vector, its length, purity, von Neumann
 *  entropy (bits) and whether the qubit is entangled with the rest. */
export function qubitReport(state: StateVector, n: number): QubitEnt[] {
  const rep: QubitEnt[] = [];
  for (let q = 0; q < n; q++) {
    const bloch = blochOf(state, q, n);
    const rho = reducedDensity(state, q, n);
    rep.push({
      qubit: q,
      bloch,
      r: Math.hypot(bloch[0], bloch[1], bloch[2]),
      purity: purity(rho),
      entropy: vonNeumannEntropy(rho),
      entangled: isEntangled(state, q, n),
    });
  }
  return rep;
}

/** True when at least one qubit is entangled with the rest. */
export function anyEntangled(rep: QubitEnt[]): boolean {
  return rep.some((q) => q.entangled);
}
