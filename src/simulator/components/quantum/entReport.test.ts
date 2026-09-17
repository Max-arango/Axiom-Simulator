import { describe, it, expect } from "vitest";
import type { Operation, StateVector } from "../../quantum/types.ts";
import { zeroState, applyOperation } from "../../quantum/statevector.ts";
import { qubitReport, anyEntangled } from "./entReport.ts";

const run = (n: number, ops: Operation[]): StateVector =>
  ops.reduce((s, o) => applyOperation(s, o, n), zeroState(n));
const op = (gate: Operation["gate"], qubits: number[], params?: Operation["params"]): Operation =>
  ({ gate, qubits, params });

describe("qubitReport", () => {
  it("product |0⟩⊗|0⟩ — every qubit pure, r≈1, entropy≈0, not entangled", () => {
    const rep = qubitReport(zeroState(2), 2);
    for (const q of rep) {
      expect(q.r).toBeCloseTo(1, 6);
      expect(q.purity).toBeCloseTo(1, 6);
      expect(q.entropy).toBeCloseTo(0, 6);
      expect(q.entangled).toBe(false);
    }
    expect(anyEntangled(rep)).toBe(false);
  });

  it("Bell H(0)·CX(0,1) — both qubits r≈0, purity≈0.5, entropy≈1, entangled", () => {
    const rep = qubitReport(run(2, [op("H", [0]), op("CX", [0, 1])]), 2);
    for (const q of rep) {
      expect(q.r).toBeCloseTo(0, 6);
      expect(q.purity).toBeCloseTo(0.5, 6);
      expect(q.entropy).toBeCloseTo(1, 6);
      expect(q.entangled).toBe(true);
    }
    expect(anyEntangled(rep)).toBe(true);
  });

  it("GHZ 3q H(0)·CX(0,1)·CX(1,2) — all qubits entropy≈1", () => {
    const rep = qubitReport(run(3, [op("H", [0]), op("CX", [0, 1]), op("CX", [1, 2])]), 3);
    for (const q of rep) {
      expect(q.entropy).toBeCloseTo(1, 6);
      expect(q.entangled).toBe(true);
    }
    expect(anyEntangled(rep)).toBe(true);
  });
});
