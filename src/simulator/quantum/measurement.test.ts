import { describe, it, expect } from "vitest";
import type { Circuit } from "./types.ts";
import { norm2 } from "./statevector.ts";
import { makeRng } from "../mathlab/core/rng.ts";
import { runCircuit } from "./simulator.ts";
import {
  bitstring, measureAll, measureQubit, probabilityOfOutcome, sampleShots,
} from "./measurement.ts";

const BELL: Circuit = { qubits: 2, ops: [{ gate: "H", qubits: [0] }, { gate: "CX", qubits: [0, 1] }] };
const PLUS: Circuit = { qubits: 1, ops: [{ gate: "H", qubits: [0] }] };
const GHZ: Circuit = {
  qubits: 3,
  ops: [{ gate: "H", qubits: [0] }, { gate: "CX", qubits: [0, 1] }, { gate: "CX", qubits: [1, 2] }],
};

describe("bitstring format (MSB-left: qubit n-1 first ... qubit 0 last)", () => {
  it("n=2 index 2 (q1=1,q0=0) → \"10\"", () => {
    expect(bitstring(2, 2)).toBe("10");
    expect(bitstring(0, 2)).toBe("00");
    expect(bitstring(3, 2)).toBe("11");
  });
});

describe("probabilityOfOutcome", () => {
  it("|+⟩: P(q0=0)=P(q0=1)=0.5", () => {
    const s = runCircuit(PLUS);
    expect(probabilityOfOutcome(s, 0, 0, 1)).toBeCloseTo(0.5, 6);
    expect(probabilityOfOutcome(s, 0, 1, 1)).toBeCloseTo(0.5, 6);
  });
});

describe("sampleShots (Bell)", () => {
  it("only \"00\"/\"11\", each ~500, counts sum to shots", () => {
    const counts = sampleShots(runCircuit(BELL), 2, 1000, makeRng(42));
    expect(Object.keys(counts).sort()).toEqual(["00", "11"]);
    expect(counts["00"]).toBeGreaterThanOrEqual(400);
    expect(counts["00"]).toBeLessThanOrEqual(600);
    expect(counts["11"]).toBeGreaterThanOrEqual(400);
    expect(counts["11"]).toBeLessThanOrEqual(600);
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    expect(total).toBe(1000);
  });
  it("same seed ⇒ identical histogram (deterministic)", () => {
    const state = runCircuit(BELL);
    expect(sampleShots(state, 2, 500, makeRng(7))).toEqual(sampleShots(state, 2, 500, makeRng(7)));
  });
});

describe("sampleShots (GHZ)", () => {
  it("only \"000\"/\"111\" present", () => {
    const counts = sampleShots(runCircuit(GHZ), 3, 800, makeRng(1));
    expect(Object.keys(counts).sort()).toEqual(["000", "111"]);
    expect(Object.values(counts).reduce((a, b) => a + b, 0)).toBe(800);
  });
});

describe("measureQubit collapse (Bell)", () => {
  it("measuring q0 forces q1 to the same value; collapsed norm2 ≈ 1", () => {
    const { outcome, state } = measureQubit(runCircuit(BELL), 0, 2, makeRng(3));
    expect(norm2(state)).toBeCloseTo(1, 6);
    // q1 is now deterministic: probability of matching q0's outcome is 1.
    expect(probabilityOfOutcome(state, 1, outcome, 2)).toBeCloseTo(1, 6);
    // and measuring q1 (any rng) returns the same value.
    const q1 = measureQubit(state, 1, 2, makeRng(999));
    expect(q1.outcome).toBe(outcome);
  });
});

describe("measureAll", () => {
  it("bits are little-endian and agree with the display bitstring", () => {
    const { index, bits, bitstring: bs } = measureAll(runCircuit(BELL), 2, makeRng(5));
    expect([0, 3]).toContain(index); // Bell only lands on 0 or 3
    expect(bits[0]).toBe(bits[1]); // Bell: q0 == q1
    expect(bs).toBe(`${bits[1]}${bits[0]}`); // MSB-left: q1 then q0
  });
});
