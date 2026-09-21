import { describe, it, expect } from "vitest";
import type { Operation, StateVector } from "./types.ts";
import { zeroState, applyOperation } from "./statevector.ts";
import { reducedDensity2, entropy4, mutualInformation, mutualInfoMatrix } from "./density2.ts";

const run = (n: number, ops: Operation[]): StateVector =>
  ops.reduce((s, o) => applyOperation(s, o, n), zeroState(n));
const op = (gate: Operation["gate"], qubits: number[], params?: Operation["params"]): Operation =>
  ({ gate, qubits, params });

describe("product state |00⟩ — no correlations", () => {
  const s = zeroState(2);
  it("ρ_AB ≈ |00⟩⟨00|, entropy 0, mutual information 0", () => {
    const rho = reducedDensity2(s, 0, 1, 2);
    expect(rho[0][0].re).toBeCloseTo(1, 6);
    for (let r = 0; r < 4; r++)
      for (let c = 0; c < 4; c++)
        if (r !== 0 || c !== 0) expect(rho[r][c].re).toBeCloseTo(0, 6);
    expect(entropy4(rho)).toBeCloseTo(0, 6);
    expect(mutualInformation(s, 0, 1, 2)).toBeCloseTo(0, 6);
  });
});

describe("Bell state H(0)·CX(0,1) — maximally entangled pair", () => {
  const bell = run(2, [op("H", [0]), op("CX", [0, 1])]);
  it("pure global state ⇒ S(AB) ≈ 0, and I(A:B) ≈ 2 bits", () => {
    expect(entropy4(reducedDensity2(bell, 0, 1, 2))).toBeCloseTo(0, 6);
    expect(mutualInformation(bell, 0, 1, 2)).toBeCloseTo(2, 6);
  });
});

describe("GHZ 3-qubit — pairwise correlations", () => {
  const ghz = run(3, [op("H", [0]), op("CX", [0, 1]), op("CX", [1, 2])]);
  it("qubits (0,1): S(AB) ≈ 1 ⇒ I(A:B) ≈ 1 bit", () => {
    expect(entropy4(reducedDensity2(ghz, 0, 1, 3))).toBeCloseTo(1, 6);
    expect(mutualInformation(ghz, 0, 1, 3)).toBeCloseTo(1, 6);
  });
  it("mutualInfoMatrix is symmetric with a zero diagonal", () => {
    const m = mutualInfoMatrix(ghz, 3);
    for (let i = 0; i < 3; i++) {
      expect(m[i][i]).toBeCloseTo(0, 6);
      for (let j = 0; j < 3; j++) expect(m[i][j]).toBeCloseTo(m[j][i], 6);
    }
    expect(m[0][1]).toBeCloseTo(1, 6);
  });
});

describe("reducedDensity2 is Hermitian, trace 1 for a multi-gate state", () => {
  it("holds on qubits (0,2) of a 3-qubit circuit", () => {
    const s = run(3, [
      op("H", [0]), op("RY", [1], { theta: 0.7 }), op("CX", [0, 2]),
      op("T", [2]), op("RX", [0], { theta: 1.3 }), op("CZ", [1, 2]),
    ]);
    const rho = reducedDensity2(s, 0, 2, 3);
    let trace = 0;
    for (let d = 0; d < 4; d++) {
      trace += rho[d][d].re;
      expect(rho[d][d].im).toBeCloseTo(0, 6); // diagonal real
    }
    expect(trace).toBeCloseTo(1, 6);
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        expect(rho[r][c].re).toBeCloseTo(rho[c][r].re, 6);
        expect(rho[r][c].im).toBeCloseTo(-rho[c][r].im, 6); // ρ[r][c] = conj(ρ[c][r])
      }
    }
  });
});
