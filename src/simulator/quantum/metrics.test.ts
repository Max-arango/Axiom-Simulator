import { describe, it, expect } from "vitest";
import { circuitMetrics } from "./metrics.ts";
import type { Circuit } from "./types.ts";

describe("circuitMetrics", () => {
  it("Bell: depth 2, 2 gates, 1 two-qubit", () => {
    const c: Circuit = { qubits: 2, ops: [{ gate: "H", qubits: [0] }, { gate: "CX", qubits: [0, 1] }] };
    const m = circuitMetrics(c);
    expect(m.depth).toBe(2);
    expect(m.width).toBe(2);
    expect(m.gateCount).toBe(2);
    expect(m.twoQubitCount).toBe(1);
    expect(m.measurements).toBe(0);
    expect(m.byGate).toEqual({ H: 1, CX: 1 });
  });

  it("GHZ-3: depth 3", () => {
    const c: Circuit = { qubits: 3, ops: [{ gate: "H", qubits: [0] }, { gate: "CX", qubits: [0, 1] }, { gate: "CX", qubits: [1, 2] }] };
    expect(circuitMetrics(c).depth).toBe(3);
  });

  it("parallel single-qubit gates on different qubits → depth 1", () => {
    const c: Circuit = { qubits: 2, ops: [{ gate: "H", qubits: [0] }, { gate: "X", qubits: [1] }] };
    expect(circuitMetrics(c).depth).toBe(1);
  });

  it("measurements counted separately, excluded from gateCount", () => {
    const c: Circuit = { qubits: 1, ops: [{ gate: "H", qubits: [0] }, { gate: "M", qubits: [0] }] };
    const m = circuitMetrics(c);
    expect(m.measurements).toBe(1);
    expect(m.gateCount).toBe(1);
  });

  it("empty circuit → all zero", () => {
    const m = circuitMetrics({ qubits: 3, ops: [] });
    expect(m.depth).toBe(0);
    expect(m.gateCount).toBe(0);
  });
});
