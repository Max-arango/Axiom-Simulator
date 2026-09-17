import { describe, it, expect } from "vitest";
import type { Operation, StateVector } from "./types.ts";
import { zeroState, applyOperation } from "./statevector.ts";
import {
  reducedDensity, blochVector, purity, vonNeumannEntropy, isEntangled, blochOf,
} from "./density.ts";

const run = (n: number, ops: Operation[]): StateVector =>
  ops.reduce((s, o) => applyOperation(s, o, n), zeroState(n));
const op = (gate: Operation["gate"], qubits: number[], params?: Operation["params"]): Operation =>
  ({ gate, qubits, params });
const nearVec = (v: [number, number, number], x: number, y: number, z: number) => {
  expect(v[0]).toBeCloseTo(x, 6);
  expect(v[1]).toBeCloseTo(y, 6);
  expect(v[2]).toBeCloseTo(z, 6);
};

describe("single-qubit pure states", () => {
  it("|0⟩ → ρ=[[1,0],[0,0]], bloch=+z, pure", () => {
    const s = zeroState(1);
    const rho = reducedDensity(s, 0, 1);
    expect(rho[0][0].re).toBeCloseTo(1, 6);
    expect(rho[1][1].re).toBeCloseTo(0, 6);
    nearVec(blochVector(rho), 0, 0, 1);
    expect(purity(rho)).toBeCloseTo(1, 6);
    expect(vonNeumannEntropy(rho)).toBeCloseTo(0, 6);
  });
  it("|+⟩ = H|0⟩ → bloch=+x, pure, entropy 0", () => {
    const rho = reducedDensity(run(1, [op("H", [0])]), 0, 1);
    nearVec(blochVector(rho), 1, 0, 0);
    expect(purity(rho)).toBeCloseTo(1, 6);
    expect(vonNeumannEntropy(rho)).toBeCloseTo(0, 6);
  });
  it("|1⟩ = X|0⟩ → bloch=−z", () => {
    nearVec(blochOf(run(1, [op("X", [0])]), 0, 1), 0, 0, -1);
  });
  it("|i⟩ = S·H|0⟩ → bloch=+y (guards y-sign)", () => {
    nearVec(blochOf(run(1, [op("H", [0]), op("S", [0])]), 0, 1), 0, 1, 0);
  });
});

describe("Bell state — maximally entangled", () => {
  const bell = run(2, [op("H", [0]), op("CX", [0, 1])]);
  for (const q of [0, 1]) {
    it(`qubit ${q}: ρ≈½I, bloch≈0, purity≈0.5, entropy≈1, entangled`, () => {
      const rho = reducedDensity(bell, q, 2);
      nearVec(blochVector(rho), 0, 0, 0);
      expect(purity(rho)).toBeCloseTo(0.5, 6);
      expect(vonNeumannEntropy(rho)).toBeCloseTo(1, 6);
      expect(isEntangled(bell, q, 2)).toBe(true);
    });
  }
});

describe("GHZ 3-qubit — every qubit maximally mixed", () => {
  const ghz = run(3, [op("H", [0]), op("CX", [0, 1]), op("CX", [1, 2])]);
  for (const q of [0, 1, 2]) {
    it(`qubit ${q}: purity≈0.5, entropy≈1`, () => {
      const rho = reducedDensity(ghz, q, 3);
      expect(purity(rho)).toBeCloseTo(0.5, 6);
      expect(vonNeumannEntropy(rho)).toBeCloseTo(1, 6);
    });
  }
});

describe("product state H(0)⊗|0⟩ — not entangled", () => {
  const prod = run(2, [op("H", [0])]);
  it("q0 pure (+x), q1 pure (+z), neither entangled", () => {
    expect(vonNeumannEntropy(reducedDensity(prod, 0, 2))).toBeCloseTo(0, 6);
    expect(vonNeumannEntropy(reducedDensity(prod, 1, 2))).toBeCloseTo(0, 6);
    nearVec(blochOf(prod, 0, 2), 1, 0, 0);
    nearVec(blochOf(prod, 1, 2), 0, 0, 1);
    expect(isEntangled(prod, 0, 2)).toBe(false);
    expect(isEntangled(prod, 1, 2)).toBe(false);
  });
});

describe("reduced density is Hermitian, trace 1", () => {
  it("holds for a multi-gate 3-qubit state", () => {
    const s = run(3, [
      op("H", [0]), op("RY", [1], { theta: 0.7 }), op("CX", [0, 2]),
      op("T", [2]), op("RX", [0], { theta: 1.3 }), op("CZ", [1, 2]),
    ]);
    for (let q = 0; q < 3; q++) {
      const rho = reducedDensity(s, q, 3);
      expect(rho[0][0].re + rho[1][1].re).toBeCloseTo(1, 6); // trace 1
      expect(rho[0][0].im).toBeCloseTo(0, 6); // diagonal real
      expect(rho[1][1].im).toBeCloseTo(0, 6);
      expect(rho[0][1].re).toBeCloseTo(rho[1][0].re, 6); // ρ01 = conj(ρ10)
      expect(rho[0][1].im).toBeCloseTo(-rho[1][0].im, 6);
    }
  });
});
