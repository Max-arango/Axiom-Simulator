import { describe, it, expect } from "vitest";
import { cellRole, columnSpan } from "./gridCell.ts";
import type { PlacedOp } from "../../quantum/quantumStore.ts";
import type { GateId } from "../../quantum/types.ts";

const op = (gate: GateId, qubits: number[], column = 0, id = "op-1"): PlacedOp => ({ id, gate, qubits, column });

describe("cellRole", () => {
  it("empty cell when nothing covers it", () => {
    expect(cellRole([], 0, 0)).toEqual({ kind: "empty" });
    expect(cellRole([op("X", [1], 0)], 0, 0)).toEqual({ kind: "empty" });
  });

  it("CX: control on first qubit, target on last, empty in between", () => {
    const cx = op("CX", [0, 2], 0);
    const p = [cx];
    expect(cellRole(p, 0, 0)).toEqual({ kind: "control", op: cx });
    expect(cellRole(p, 2, 0)).toEqual({ kind: "target", op: cx });
    expect(cellRole(p, 1, 0)).toEqual({ kind: "empty" }); // spanned by the wire, not owned
  });

  it("CCX: both controls then target", () => {
    const ccx = op("CCX", [0, 1, 3], 0);
    const p = [ccx];
    expect(cellRole(p, 0, 0).kind).toBe("control");
    expect(cellRole(p, 1, 0).kind).toBe("control");
    expect(cellRole(p, 3, 0).kind).toBe("target");
  });

  it("single, swap and measure classified by kind", () => {
    expect(cellRole([op("H", [0])], 0, 0).kind).toBe("single");
    const sw = op("SWAP", [0, 1]);
    expect(cellRole([sw], 0, 0).kind).toBe("swap");
    expect(cellRole([sw], 1, 0).kind).toBe("swap");
    expect(cellRole([op("M", [2])], 2, 0).kind).toBe("measure");
  });

  it("matches the right column only", () => {
    const p = [op("H", [0], 3)];
    expect(cellRole(p, 0, 0).kind).toBe("empty");
    expect(cellRole(p, 0, 3).kind).toBe("single");
  });
});

describe("columnSpan", () => {
  it("min/max over qubit indices", () => {
    expect(columnSpan(op("CX", [0, 2]))).toEqual({ min: 0, max: 2 });
    expect(columnSpan(op("CCX", [3, 1, 0]))).toEqual({ min: 0, max: 3 });
    expect(columnSpan(op("H", [1]))).toEqual({ min: 1, max: 1 });
  });
});
