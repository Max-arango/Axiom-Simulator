// Circuit runner: folds a Circuit's ops over the statevector foundation.
// Little-endian throughout (see types.ts). Measurement ops are no-ops on the
// vector here (applyOperation handles that); actual sampling/collapse lives in
// measurement.ts. Every function returns a fresh StateVector; inputs untouched.

import { applyOperation, normalize, zeroState } from "./statevector.ts";
import type { Circuit, StateVector } from "./types.ts";

/** Run the whole circuit from |0…0⟩; final normalize for numerical hygiene. */
export function runCircuit(circuit: Circuit): StateVector {
  let state = zeroState(circuit.qubits);
  for (const op of circuit.ops) state = applyOperation(state, op, circuit.qubits);
  return normalize(state);
}

/**
 * State after each prefix of ops, for step-by-step UI.
 * Length ops.length+1: index 0 = |0…0⟩, index k = state after ops[0..k-1].
 * Intermediate states are left as raw unitary evolution (already ~unit norm).
 */
export function runSteps(circuit: Circuit): StateVector[] {
  const states: StateVector[] = [zeroState(circuit.qubits)];
  for (const op of circuit.ops) {
    states.push(applyOperation(states[states.length - 1], op, circuit.qubits));
  }
  return states;
}

/** State after `step` ops, step clamped to [0, ops.length]. */
export function stateAtStep(circuit: Circuit, step: number): StateVector {
  const clamped = Math.max(0, Math.min(step, circuit.ops.length));
  return runSteps(circuit)[clamped];
}
