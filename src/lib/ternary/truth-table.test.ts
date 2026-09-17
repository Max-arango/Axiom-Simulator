import { describe, it, expect } from "vitest";
import { allInputRows, fromFunction, fromTable, enumerate } from "./truth-table.ts";
import { balancedGates } from "./gates.ts";
import { Trit } from "./trit.ts";

describe("allInputRows enumerates the full input space", () => {
  it("has 3^arity rows, all distinct", () => {
    for (const system of ["balanced", "unbalanced"] as const) {
      for (let arity = 0; arity <= 4; arity++) {
        const rows = allInputRows(system, arity);
        expect(rows.length).toBe(3 ** arity);
        expect(new Set(rows.map((r) => r.join(","))).size).toBe(3 ** arity);
      }
    }
  });
});

describe("fromFunction", () => {
  it("wraps a pure fn and enumerates all rows (balanced XOR as 2->1)", () => {
    const f = fromFunction("balanced", 2, 1, ([a, b]) => [balancedGates.XOR(a, b)]);
    const table = enumerate(f);
    expect(table.length).toBe(9);
    expect(table.map((r) => r.outputs[0])).toEqual([-1, 0, 1, 0, 0, 0, 1, 0, -1]);
  });

  it("validates arity, output count, and digit legality", () => {
    const f = fromFunction("balanced", 2, 1, ([a]) => [a]);
    expect(() => f.eval([1] as Trit[])).toThrow(); // wrong input count
    expect(() => f.eval([2 as never, 0])).toThrow(); // 2 illegal in balanced
    const bad = fromFunction("balanced", 1, 1, () => [0, 0]);
    expect(() => bad.eval([0])).toThrow(); // wrong output count
  });
});

describe("fromTable builds a custom function", () => {
  it("round-trips a user table and enumerates it", () => {
    // A 1-input unbalanced 'rotate up' function: 0->1, 1->2, 2->0.
    const rows = [
      { inputs: [0] as Trit[], outputs: [1] as Trit[] },
      { inputs: [1] as Trit[], outputs: [2] as Trit[] },
      { inputs: [2] as Trit[], outputs: [0] as Trit[] },
    ];
    const f = fromTable("unbalanced", 1, 1, rows);
    expect(f.eval([0])).toEqual([1]);
    expect(f.eval([2])).toEqual([0]);
    expect(enumerate(f).map((r) => r.outputs[0])).toEqual([1, 2, 0]);
  });

  it("throws on an input tuple not present in the table", () => {
    const f = fromTable("balanced", 1, 1, [
      { inputs: [0], outputs: [0] },
    ]);
    expect(() => f.eval([1])).toThrow();
  });

  it("rejects rows with wrong shape or illegal digits at build time", () => {
    expect(() =>
      fromTable("balanced", 2, 1, [{ inputs: [0], outputs: [0] }]),
    ).toThrow(); // input arity mismatch
    expect(() =>
      fromTable("unbalanced", 1, 1, [{ inputs: [-1 as never], outputs: [0] }]),
    ).toThrow(); // -1 illegal in unbalanced
  });
});
