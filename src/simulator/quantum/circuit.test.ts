import { describe, it, expect } from "vitest";
import type { Circuit } from "./types.ts";
import {
  emptyCircuit,
  validate,
  toExport,
  fromExport,
  serialize,
  deserialize,
  toText,
} from "./circuit.ts";

const bell: Circuit = {
  qubits: 2,
  ops: [{ gate: "H", qubits: [0] }, { gate: "CX", qubits: [0, 1] }],
};
const ghz: Circuit = {
  qubits: 3,
  ops: [
    { gate: "H", qubits: [0] },
    { gate: "CX", qubits: [0, 1] },
    { gate: "CX", qubits: [1, 2] },
  ],
};

describe("validate accepts valid circuits", () => {
  it("accepts bell and ghz", () => {
    expect(validate(bell)).toEqual({ ok: true, errors: [] });
    expect(validate(ghz)).toEqual({ ok: true, errors: [] });
    expect(validate(emptyCircuit(3))).toEqual({ ok: true, errors: [] });
  });
});

describe("validate rejects with friendly messages", () => {
  it("CX on the same qubit", () => {
    const r = validate({ qubits: 2, ops: [{ gate: "CX", qubits: [1, 1] }] });
    expect(r.ok).toBe(false);
    expect(r.errors).toContain("CNOT requires two different qubits.");
  });
  it("qubit index out of range", () => {
    const r = validate({ qubits: 2, ops: [{ gate: "X", qubits: [5] }] });
    expect(r.ok).toBe(false);
    expect(r.errors).toContain("Gate references qubit 5 which does not exist.");
  });
  it("wrong arity (CX with 1 qubit)", () => {
    const r = validate({ qubits: 2, ops: [{ gate: "CX", qubits: [0] }] });
    expect(r.ok).toBe(false);
    expect(r.errors).toContain("CX requires 2 qubits (control, target).");
  });
  it("RX missing theta", () => {
    const r = validate({ qubits: 1, ops: [{ gate: "RX", qubits: [0] }] });
    expect(r.ok).toBe(false);
    expect(r.errors).toContain("RX requires a θ parameter.");
  });
  it("qubit count 0 or 9", () => {
    expect(validate({ qubits: 0, ops: [] }).errors).toContain("Circuit must have 1–8 qubits.");
    expect(validate({ qubits: 9, ops: [] }).errors).toContain("Circuit must have 1–8 qubits.");
  });
  it("collects every error, not just the first", () => {
    const r = validate({ qubits: 0, ops: [{ gate: "CX", qubits: [1, 1] }] });
    expect(r.errors.length).toBeGreaterThanOrEqual(2);
  });
});

describe("JSON round-trip", () => {
  it("deserialize(serialize(bell)) deep-equals bell", () => {
    expect(deserialize(serialize(bell))).toEqual(bell);
    expect(deserialize(serialize(ghz))).toEqual(ghz);
  });
  it("toExport uses `operations` field", () => {
    const e = toExport(bell);
    expect(e.qubits).toBe(2);
    expect(e.operations).toHaveLength(2);
    expect(e.operations[0]).toEqual({ gate: "H", qubits: [0] });
  });
});

describe("fromExport is a defensive trust boundary", () => {
  it("throws on non-object", () => {
    expect(() => fromExport(42)).toThrow();
    expect(() => fromExport(null)).toThrow();
    expect(() => fromExport("nope")).toThrow();
  });
  it("throws on missing operations", () => {
    expect(() => fromExport({ qubits: 2 })).toThrow();
  });
  it("throws on unknown gate", () => {
    expect(() => fromExport({ qubits: 1, operations: [{ gate: "FOO", qubits: [0] }] })).toThrow();
  });
  it("throws on malformed op", () => {
    expect(() => fromExport({ qubits: 1, operations: [{ gate: "H" }] })).toThrow();
    expect(() => fromExport({ qubits: 1, operations: [42] })).toThrow();
  });
  it("deserialize throws 'Invalid JSON' on bad JSON", () => {
    expect(() => deserialize("{bad")).toThrow(/Invalid JSON/);
  });
});

describe("toText", () => {
  it("renders bell legibly without throwing", () => {
    const t = toText(bell);
    expect(typeof t).toBe("string");
    expect(t).toContain("q0");
    expect(t).toContain("H");
  });
});
