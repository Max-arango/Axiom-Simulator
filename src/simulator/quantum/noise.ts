// Noise model for the Quantum Lab — Monte-Carlo (quantum-trajectory) unravelling,
// NOT a fake effect. Each shot draws a concrete error realization; averaging over
// many shots estimates the true noisy (density-matrix) distribution. Only shots
// carry noise; the ideal statevector/Bloch panels stay exact.
//
// - depolarizing: after every gate, each acted qubit gets a uniformly random Pauli
//   {X,Y,Z} with probability p — the exact unravelling of the per-qubit depolarizing
//   channel with Pauli-error probability p.
// - readout: a measured classical bit is misreported (flipped) with probability p;
//   the collapsed quantum state is unchanged (classical readout error).
import type { Rng } from "../mathlab/core/rng.ts";
import { applyMat2 } from "./statevector.ts";
import { gateMatrix } from "./gates.ts";
import type { GateId, StateVector } from "./types.ts";

export interface NoiseConfig {
  enabled: boolean;
  depolarizing: number; // per-gate, per-qubit Pauli-error probability
  readout: number; // per-measurement bit-flip probability
}

export const NO_NOISE: NoiseConfig = { enabled: false, depolarizing: 0, readout: 0 };

/** After a gate, kick each acted qubit with a random Pauli w.p. `p` (depolarizing). */
export function applyDepolarizing(state: StateVector, qubits: number[], n: number, p: number, rng: Rng): StateVector {
  if (p <= 0) return state;
  let s = state;
  for (const q of qubits) {
    if (rng.next() < p) {
      const r = rng.next();
      const g: GateId = r < 1 / 3 ? "X" : r < 2 / 3 ? "Y" : "Z";
      s = applyMat2(s, gateMatrix(g), q, n);
    }
  }
  return s;
}
