import { describe, it, expect } from "vitest";
import type { Circuit } from "./types.ts";
import { probabilities } from "./statevector.ts";
import { runCircuit, runSteps, stateAtStep } from "./simulator.ts";

const R2 = Math.SQRT1_2;

// Bell: H(0)·CX(0→1) → (|00⟩+|11⟩)/√2 at little-endian indices 0 and 3.
const BELL: Circuit = { qubits: 2, ops: [{ gate: "H", qubits: [0] }, { gate: "CX", qubits: [0, 1] }] };
// GHZ: H(0)·CX(0→1)·CX(1→2) → (|000⟩+|111⟩)/√2 at indices 0 and 7.
const GHZ: Circuit = {
  qubits: 3,
  ops: [{ gate: "H", qubits: [0] }, { gate: "CX", qubits: [0, 1] }, { gate: "CX", qubits: [1, 2] }],
};

describe("runCircuit", () => {
  it("Bell → amp[0]=amp[3]≈1/√2, amp[1]=amp[2]≈0", () => {
    const s = runCircuit(BELL);
    expect(s[0].re).toBeCloseTo(R2, 6);
    expect(s[3].re).toBeCloseTo(R2, 6);
    expect(s[1].re).toBeCloseTo(0, 6);
    expect(s[2].re).toBeCloseTo(0, 6);
  });
  it("GHZ → only indices 0 and 7 carry probability 0.5", () => {
    const p = probabilities(runCircuit(GHZ));
    for (let i = 0; i < 8; i++) {
      expect(p[i]).toBeCloseTo(i === 0 || i === 7 ? 0.5 : 0, 6);
    }
  });
});

describe("runSteps / stateAtStep", () => {
  it("length = ops.length+1 and index 0 is the zero state", () => {
    const steps = runSteps(BELL);
    expect(steps.length).toBe(3);
    expect(steps[0][0].re).toBeCloseTo(1, 6); // |00⟩
    expect(steps[0][1].re).toBeCloseTo(0, 6);
  });
  it("after step 1 (H only) q0 is in superposition amp[0]=amp[1]≈1/√2", () => {
    const afterH = runSteps(BELL)[1];
    expect(afterH[0].re).toBeCloseTo(R2, 6);
    expect(afterH[1].re).toBeCloseTo(R2, 6);
    expect(afterH[2].re).toBeCloseTo(0, 6);
    expect(afterH[3].re).toBeCloseTo(0, 6);
  });
  it("stateAtStep clamps out-of-range steps to the endpoints", () => {
    const first = stateAtStep(BELL, -5);
    expect(first[0].re).toBeCloseTo(1, 6); // clamped to step 0
    const last = stateAtStep(BELL, 99);
    expect(last[0].re).toBeCloseTo(R2, 6); // clamped to final Bell state
    expect(last[3].re).toBeCloseTo(R2, 6);
  });
});
