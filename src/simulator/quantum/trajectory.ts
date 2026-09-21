// Trajectory (single-shot) execution with a classical register: mid-circuit
// measurement collapses the state and writes a classical bit; RESET forces a qubit
// to |0⟩ (measure + conditional X); conditional gates (op.condition) apply only when
// a classical bit matches. Stochastic — seed the Rng for a deterministic run; run
// many trajectories for statistics. Circuits with no measurement/reset/condition
// behave identically to the pure unitary fold (the Rng is never consumed).
import { makeRng, type Rng } from "../mathlab/core/rng.ts";
import { applyMat2, applyOperation, zeroState } from "./statevector.ts";
import { measureQubit, measureAll } from "./measurement.ts";
import { GATES, gateMatrix } from "./gates.ts";
import { applyDepolarizing, NO_NOISE, type NoiseConfig } from "./noise.ts";
import type { Circuit, Operation, StateVector } from "./types.ts";

export interface TrajResult {
  state: StateVector;
  clbits: number[]; // classical register after the run
}

/** True if the op list needs stochastic (trajectory) execution rather than a pure fold. */
export function isStochastic(ops: Operation[]): boolean {
  return ops.some((op) => op.condition !== undefined || GATES[op.gate].kind === "measure" || GATES[op.gate].kind === "reset");
}

/** Run one seeded trajectory of the whole circuit, optionally under a noise model. */
export function runTrajectory(circuit: Circuit, rng: Rng, noise: NoiseConfig = NO_NOISE): TrajResult {
  const n = circuit.qubits;
  const ncl = circuit.clbits ?? n;
  let state = zeroState(n);
  const clbits = new Array(ncl).fill(0);
  const noisy = noise.enabled;

  for (const op of circuit.ops) {
    if (op.condition && clbits[op.condition.clbit] !== op.condition.value) continue; // c_if false → skip
    const kind = GATES[op.gate].kind;
    if (kind === "measure") {
      const q = op.qubits[0];
      const r = measureQubit(state, q, n, rng);
      state = r.state;
      const cb = op.clbit ?? q;
      // readout error: misreport the classical bit (state stays collapsed)
      const reported = noisy && noise.readout > 0 && rng.next() < noise.readout ? (r.outcome ^ 1) : r.outcome;
      if (cb >= 0 && cb < ncl) clbits[cb] = reported;
    } else if (kind === "reset") {
      const q = op.qubits[0];
      const r = measureQubit(state, q, n, rng);
      state = r.outcome === 1 ? applyMat2(r.state, gateMatrix("X"), q, n) : r.state; // force |0⟩
    } else if (kind === "barrier") {
      // no-op
    } else {
      state = applyOperation(state, op, n);
      if (noisy) state = applyDepolarizing(state, op.qubits, n, noise.depolarizing, rng); // gate error
    }
  }
  return { state, clbits };
}

/** Convenience: run a trajectory with a fresh seeded Rng. */
export function runTrajectorySeeded(circuit: Circuit, seed: number): TrajResult {
  return runTrajectory(circuit, makeRng(seed));
}

/**
 * Shot histogram via trajectories (mid-circuit measurement / feed-forward / noise).
 * If the circuit has explicit M ops → key = classical-register bitstring; otherwise
 * every qubit is measured at the end. One shared Rng across shots → deterministic.
 */
export function runShotsTrajectory(
  circuit: Circuit, shots: number, rng: Rng, noise: NoiseConfig = NO_NOISE,
): Record<string, number> {
  const n = circuit.qubits;
  const ncl = circuit.clbits ?? n;
  const hasMeasure = circuit.ops.some((op) => GATES[op.gate].kind === "measure");
  const counts: Record<string, number> = {};
  for (let s = 0; s < shots; s++) {
    const { state, clbits } = runTrajectory(circuit, rng, noise);
    let key: string;
    if (hasMeasure) {
      key = "";
      for (let c = ncl - 1; c >= 0; c--) key += clbits[c] ? "1" : "0";
    } else {
      key = measureAll(state, n, rng).bitstring; // no explicit M → measure all at the end
    }
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}
