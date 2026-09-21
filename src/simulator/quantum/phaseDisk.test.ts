import { describe, it, expect } from "vitest";
import type { Operation, StateVector } from "./types.ts";
import { zeroState, applyOperation } from "./statevector.ts";
import { phaseDisk, phaseDisks } from "./phaseDisk.ts";

const run = (n: number, ops: Operation[]): StateVector =>
  ops.reduce((s, o) => applyOperation(s, o, n), zeroState(n));
const op = (gate: Operation["gate"], qubits: number[]): Operation => ({ gate, qubits });

describe("phaseDisk", () => {
  it("|0⟩: p1≈0, pure", () => {
    const d = phaseDisk(zeroState(1), 0, 1);
    expect(d.p1).toBeCloseTo(0, 6);
    expect(d.purity).toBeCloseTo(1, 6);
  });

  it("|1⟩ = X|0⟩: p1≈1, pure", () => {
    const d = phaseDisk(run(1, [op("X", [0])]), 0, 1);
    expect(d.p1).toBeCloseTo(1, 6);
    expect(d.purity).toBeCloseTo(1, 6);
  });

  it("|+⟩ = H|0⟩: p1≈0.5, phase≈0", () => {
    const d = phaseDisk(run(1, [op("H", [0])]), 0, 1);
    expect(d.p1).toBeCloseTo(0.5, 6);
    expect(d.phase).toBeCloseTo(0, 6);
    expect(d.purity).toBeCloseTo(1, 6);
  });

  it("|i⟩ = S·H|0⟩: p1≈0.5, phase≈π/2", () => {
    const d = phaseDisk(run(1, [op("H", [0]), op("S", [0])]), 0, 1);
    expect(d.p1).toBeCloseTo(0.5, 6);
    expect(d.phase).toBeCloseTo(Math.PI / 2, 6);
  });

  it("|−⟩ = Z·H|0⟩: p1≈0.5, |phase|≈π", () => {
    const d = phaseDisk(run(1, [op("H", [0]), op("Z", [0])]), 0, 1);
    expect(d.p1).toBeCloseTo(0.5, 6);
    expect(Math.abs(d.phase)).toBeCloseTo(Math.PI, 6);
  });

  it("Bell qubit H(0)·CX(0,1): p1≈0.5, purity≈0.5 (mixed), phase 0", () => {
    const d = phaseDisk(run(2, [op("H", [0]), op("CX", [0, 1])]), 0, 2);
    expect(d.p1).toBeCloseTo(0.5, 6);
    expect(d.purity).toBeCloseTo(0.5, 6);
    expect(d.phase).toBeCloseTo(0, 6); // diagonal ρ → no defined coherence
  });

  it("phaseDisks returns one disk per qubit, in order", () => {
    const disks = phaseDisks(run(2, [op("H", [0]), op("CX", [0, 1])]), 2);
    expect(disks.map((d) => d.qubit)).toEqual([0, 1]);
    for (const d of disks) expect(d.purity).toBeCloseTo(0.5, 6);
  });
});
