import { describe, it, expect } from "vitest";
import type { Operation, StateVector } from "./types.ts";
import { zeroState, applyOperation } from "./statevector.ts";
import { expectationPauli, expectX, expectY, expectZ, expectZZ } from "./observables.ts";

const run = (n: number, ops: Operation[]): StateVector =>
  ops.reduce((s, o) => applyOperation(s, o, n), zeroState(n));
const op = (gate: Operation["gate"], qubits: number[]): Operation => ({ gate, qubits });

describe("single-qubit ⟨Z⟩", () => {
  it("|0⟩ → +1", () => {
    expect(expectZ(zeroState(1), 0, 1)).toBeCloseTo(1, 6);
  });
  it("|1⟩ = X|0⟩ → −1", () => {
    expect(expectZ(run(1, [op("X", [0])]), 0, 1)).toBeCloseTo(-1, 6);
  });
  it("|+⟩ = H|0⟩ → 0", () => {
    expect(expectZ(run(1, [op("H", [0])]), 0, 1)).toBeCloseTo(0, 6);
  });
});

describe("single-qubit ⟨X⟩ and ⟨Y⟩", () => {
  it("⟨X⟩ on |+⟩ → +1", () => {
    expect(expectX(run(1, [op("H", [0])]), 0, 1)).toBeCloseTo(1, 6);
  });
  it("⟨X⟩ on |0⟩ → 0", () => {
    expect(expectX(zeroState(1), 0, 1)).toBeCloseTo(0, 6);
  });
  it("⟨Y⟩ on |i⟩ = S·H|0⟩ → +1", () => {
    expect(expectY(run(1, [op("H", [0]), op("S", [0])]), 0, 1)).toBeCloseTo(1, 6);
  });
});

describe("Bell state correlations (H0, CX01)", () => {
  const bell = () => run(2, [op("H", [0]), op("CX", [0, 1])]);
  it("⟨Z0 Z1⟩ → +1 (perfect correlation)", () => {
    expect(expectZZ(bell(), 0, 1, 2)).toBeCloseTo(1, 6);
  });
  it("⟨X0 X1⟩ → +1", () => {
    expect(expectationPauli(bell(), ["X", "X"], 2)).toBeCloseTo(1, 6);
  });
  it("⟨Z0⟩ → 0 (locally maximally mixed)", () => {
    expect(expectZ(bell(), 0, 2)).toBeCloseTo(0, 6);
  });
});

describe("expectation is real and bounded", () => {
  it("stays within [−1,1] for a generic single-qubit state (imag ≈ 0)", () => {
    const s = run(1, [op("H", [0]), op("T", [0]), op("Y", [0])]);
    for (const v of [expectX(s, 0, 1), expectY(s, 0, 1), expectZ(s, 0, 1)]) {
      expect(v).toBeGreaterThanOrEqual(-1 - 1e-9);
      expect(v).toBeLessThanOrEqual(1 + 1e-9);
    }
  });
});

describe("guards", () => {
  it("rejects paulis length ≠ n", () => {
    expect(() => expectationPauli(zeroState(2), ["Z"], 2)).toThrow();
  });
  it("rejects n out of [1,6]", () => {
    expect(() => expectationPauli([], [], 0)).toThrow();
  });
});
