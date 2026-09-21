import { describe, it, expect } from "vitest";
import { makeRng } from "../mathlab/core/rng.ts";
import { runTrajectory, runShotsTrajectory, isStochastic } from "./trajectory.ts";
import { probabilities } from "./statevector.ts";
import { blochOf } from "./density.ts";
import type { Circuit } from "./types.ts";

// P(qubit q == 1) from a state vector.
function p1(state: { re: number; im: number }[], q: number, n: number): number {
  const probs = probabilities(state);
  let s = 0;
  for (let i = 0; i < probs.length; i++) if ((i >> q) & 1) s += probs[i];
  return s;
}

describe("trajectory execution", () => {
  it("non-stochastic circuit equals the pure fold (Bell)", () => {
    const bell: Circuit = { qubits: 2, ops: [{ gate: "H", qubits: [0] }, { gate: "CX", qubits: [0, 1] }] };
    expect(isStochastic(bell.ops)).toBe(false);
    const { state } = runTrajectory(bell, makeRng(1));
    const p = probabilities(state);
    expect(p[0]).toBeCloseTo(0.5, 6);
    expect(p[3]).toBeCloseTo(0.5, 6);
  });

  it("measurement collapses and writes a classical bit", () => {
    const c: Circuit = { qubits: 1, ops: [{ gate: "H", qubits: [0] }, { gate: "M", qubits: [0], clbit: 0 }] };
    expect(isStochastic(c.ops)).toBe(true);
    // after measuring, the state is a definite basis state matching the recorded bit
    for (const seed of [1, 2, 3, 7, 42]) {
      const { state, clbits } = runTrajectory(c, makeRng(seed));
      const p = probabilities(state);
      expect(p[clbits[0]]).toBeCloseTo(1, 6); // collapsed to |clbit⟩
    }
  });

  it("conditional gate applies only when the classical bit matches (deterministic feed-forward)", () => {
    // q0 = |1⟩ for sure; measure → c0 = 1; then X(q1) if c0==1 → q1 flips to 1
    const c: Circuit = {
      qubits: 2,
      ops: [
        { gate: "X", qubits: [0] },
        { gate: "M", qubits: [0], clbit: 0 },
        { gate: "X", qubits: [1], condition: { clbit: 0, value: 1 } },
      ],
    };
    const { state, clbits } = runTrajectory(c, makeRng(5));
    expect(clbits[0]).toBe(1);
    expect(p1(state, 1, 2)).toBeCloseTo(1, 6); // q1 was flipped
  });

  it("RESET forces a qubit back to |0⟩", () => {
    const c: Circuit = { qubits: 1, ops: [{ gate: "X", qubits: [0] }, { gate: "RESET", qubits: [0] }] };
    const { state } = runTrajectory(c, makeRng(3));
    expect(p1(state, 0, 1)).toBeCloseTo(0, 6);
  });

  it("real teleportation: q0's state arrives at q2 for EVERY measurement outcome", () => {
    // message on q0, Bell pair (q1,q2), Bell-measure q0,q1, correct q2 via c_if.
    function teleport(prep: Circuit["ops"]): Circuit {
      return {
        qubits: 3,
        clbits: 3,
        ops: [
          ...prep, // prepare the message on q0
          { gate: "H", qubits: [1] },
          { gate: "CX", qubits: [1, 2] }, // Bell pair on q1,q2
          { gate: "CX", qubits: [0, 1] },
          { gate: "H", qubits: [0] },
          { gate: "M", qubits: [0], clbit: 0 },
          { gate: "M", qubits: [1], clbit: 1 },
          { gate: "X", qubits: [2], condition: { clbit: 1, value: 1 } },
          { gate: "Z", qubits: [2], condition: { clbit: 0, value: 1 } },
        ],
      };
    }

    // Input |1⟩ → q2 must be |1⟩ with certainty, whatever the random outcomes.
    for (const seed of [1, 2, 3, 4, 8, 13, 21]) {
      const { state } = runTrajectory(teleport([{ gate: "X", qubits: [0] }]), makeRng(seed));
      expect(p1(state, 2, 3)).toBeCloseTo(1, 6);
    }

    // Input |+⟩ (H on q0) → q2's Bloch x-component must be +1.
    for (const seed of [1, 5, 9, 17]) {
      const { state } = runTrajectory(teleport([{ gate: "H", qubits: [0] }]), makeRng(seed));
      const [x] = blochOf(state, 2, 3);
      expect(x).toBeCloseTo(1, 6);
    }
  });

  it("runShotsTrajectory histograms the classical register deterministically per seed", () => {
    // H(0), measure → ~50/50 over classical bit 0
    const c: Circuit = { qubits: 1, clbits: 1, ops: [{ gate: "H", qubits: [0] }, { gate: "M", qubits: [0], clbit: 0 }] };
    const a = runShotsTrajectory(c, 1000, makeRng(42));
    expect(Object.values(a).reduce((x, y) => x + y, 0)).toBe(1000);
    expect((a["0"] ?? 0)).toBeGreaterThan(400);
    expect((a["1"] ?? 0)).toBeGreaterThan(400);
    const b = runShotsTrajectory(c, 1000, makeRng(42));
    expect(b).toEqual(a); // deterministic
  });
});
