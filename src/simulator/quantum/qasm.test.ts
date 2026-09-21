import { describe, it, expect } from "vitest";
import { toQasm, fromQasm } from "./qasm.ts";
import type { Circuit } from "./types.ts";

describe("toQasm", () => {
  it("emits a Bell circuit with qreg, h and cx lines", () => {
    const bell: Circuit = {
      qubits: 2,
      ops: [
        { gate: "H", qubits: [0] },
        { gate: "CX", qubits: [0, 1] },
      ],
    };
    const src = toQasm(bell);
    expect(src).toContain("qreg q[2];");
    expect(src).toContain("h q[0];");
    expect(src).toContain("cx q[0],q[1];");
  });

  it("emits barrier and measure lines", () => {
    const c: Circuit = {
      qubits: 2,
      ops: [
        { gate: "H", qubits: [0] },
        { gate: "BARRIER", qubits: [0] },
        { gate: "M", qubits: [1] },
      ],
    };
    const src = toQasm(c);
    expect(src).toContain("barrier q[0];");
    expect(src).toContain("measure q[1] -> c[1];");
  });
});

describe("fromQasm", () => {
  it("round-trips H, RX(θ), CX, CZ, SWAP, RZZ(θ), measure", () => {
    const c: Circuit = {
      qubits: 3,
      ops: [
        { gate: "H", qubits: [0] },
        { gate: "RX", qubits: [1], params: { theta: 0.7 } },
        { gate: "CX", qubits: [0, 1] },
        { gate: "CZ", qubits: [1, 2] },
        { gate: "SWAP", qubits: [0, 2] },
        { gate: "RZZ", qubits: [1, 2], params: { theta: 1.234 } },
        { gate: "M", qubits: [0] },
      ],
    };
    const back = fromQasm(toQasm(c));
    expect(back.qubits).toBe(c.qubits);
    expect(back.ops.length).toBe(c.ops.length);
    back.ops.forEach((op, i) => {
      const orig = c.ops[i];
      expect(op.gate).toBe(orig.gate);
      expect(op.qubits).toEqual(orig.qubits);
      if (orig.params?.theta !== undefined) {
        expect(op.params?.theta).toBeCloseTo(orig.params.theta, 6);
      }
    });
  });

  it("evaluates pi expressions in angle arguments", () => {
    const c = fromQasm("qreg q[1];\nrx(pi/2) q[0];");
    expect(c.ops[0].gate).toBe("RX");
    expect(c.ops[0].params?.theta).toBeCloseTo(Math.PI / 2, 6);
  });

  it("rejects an unsupported gate name", () => {
    expect(() => fromQasm("OPENQASM 2.0;\nqreg q[2];\nfoo q[0];")).toThrow(/no soportada/);
  });

  it("rejects input with no qreg declaration", () => {
    expect(() => fromQasm("h q[0];\nx q[1];")).toThrow(/qreg/);
  });
});
