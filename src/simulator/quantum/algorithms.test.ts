import { describe, it, expect } from "vitest";
import type { Operation, StateVector } from "./types.ts";
import { zeroState, applyOperation, probabilities } from "./statevector.ts";
import { validate } from "./circuit.ts";
import { ALGORITHMS, getAlgorithm } from "./algorithms.ts";

// Fold every non-measurement op onto a fresh zero state (measurement is a no-op
// in statevector.ts, but skipping keeps intent explicit for correctness checks).
const foldUnitary = (n: number, ops: Operation[]): StateVector =>
  ops.filter((o) => o.gate !== "M").reduce((s, o) => applyOperation(s, o, n), zeroState(n));

describe("presets", () => {
  it("every ALGORITHMS entry passes validate()", () => {
    for (const a of ALGORITHMS) {
      const r = validate(a.circuit);
      expect(r.errors, `${a.id}: ${r.errors.join(" ")}`).toEqual([]);
      expect(r.ok).toBe(true);
    }
  });

  it("bell produces (|00⟩ + |11⟩)/√2", () => {
    const bell = getAlgorithm("bell")!;
    const p = probabilities(foldUnitary(bell.circuit.qubits, bell.circuit.ops));
    expect(p[0]).toBeCloseTo(0.5, 6);
    expect(p[3]).toBeCloseTo(0.5, 6);
    expect(p[1]).toBeCloseTo(0, 6);
    expect(p[2]).toBeCloseTo(0, 6);
  });

  it("ghz produces (|000⟩ + |111⟩)/√2", () => {
    const ghz = getAlgorithm("ghz")!;
    const p = probabilities(foldUnitary(ghz.circuit.qubits, ghz.circuit.ops));
    expect(p[0]).toBeCloseTo(0.5, 6);
    expect(p[7]).toBeCloseTo(0.5, 6);
    for (const i of [1, 2, 3, 4, 5, 6]) expect(p[i]).toBeCloseTo(0, 6);
  });

  it("getAlgorithm resolves ids", () => {
    expect(getAlgorithm("bell")).toBe(ALGORITHMS.find((a) => a.id === "bell"));
    expect(getAlgorithm("nope")).toBeUndefined();
  });
});
