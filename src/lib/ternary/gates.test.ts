import { describe, it, expect } from "vitest";
import {
  balancedGates,
  unbalancedGates,
  truthTableFor,
  GATE_ARITY,
  GateName,
} from "./gates.ts";

// outputs of a gate's full truth table, in enumeration order.
// binary rows: a outer over [-1,0,1] (or [0,1,2]), b inner. unary: 3 rows.
const outs = (system: "balanced" | "unbalanced", name: GateName) =>
  truthTableFor(system, name).map((r) => r.output);

describe("balanced truth tables (rows: a∈{-1,0,1} × b∈{-1,0,1})", () => {
  it("NOT (3 rows: -1,0,1)", () => {
    expect(outs("balanced", "NOT")).toEqual([1, 0, -1]);
  });
  it("AND = MIN", () => {
    expect(outs("balanced", "AND")).toEqual([-1, -1, -1, -1, 0, 0, -1, 0, 1]);
    expect(outs("balanced", "MIN")).toEqual(outs("balanced", "AND"));
  });
  it("OR = MAX", () => {
    expect(outs("balanced", "OR")).toEqual([-1, 0, 1, 0, 0, 1, 1, 1, 1]);
    expect(outs("balanced", "MAX")).toEqual(outs("balanced", "OR"));
  });
  it("NAND = NOT(AND)", () => {
    expect(outs("balanced", "NAND")).toEqual([1, 1, 1, 1, 0, 0, 1, 0, -1]);
  });
  it("NOR = NOT(OR)", () => {
    expect(outs("balanced", "NOR")).toEqual([1, 0, -1, 0, 0, -1, -1, -1, -1]);
  });
  it("XNOR = a·b (AXIOM-defined)", () => {
    expect(outs("balanced", "XNOR")).toEqual([1, 0, -1, 0, 0, 0, -1, 0, 1]);
  });
  it("XOR = NOT(XNOR) (AXIOM-defined)", () => {
    expect(outs("balanced", "XOR")).toEqual([-1, 0, 1, 0, 0, 0, 1, 0, -1]);
  });
  it("SUM (half-adder sum digit)", () => {
    expect(outs("balanced", "SUM")).toEqual([1, -1, 0, -1, 0, 1, 0, 1, -1]);
  });
  it("CARRY (half-adder carry)", () => {
    expect(outs("balanced", "CARRY")).toEqual([-1, 0, 0, 0, 0, 0, 0, 0, 1]);
  });
  it("COMPARE = sign(a-b)", () => {
    expect(outs("balanced", "COMPARE")).toEqual([0, -1, -1, 1, 0, -1, 1, 1, 0]);
  });
});

describe("unbalanced truth tables (rows: a∈{0,1,2} × b∈{0,1,2})", () => {
  it("NOT = 2-x (3 rows: 0,1,2)", () => {
    expect(outs("unbalanced", "NOT")).toEqual([2, 1, 0]);
  });
  it("AND = MIN", () => {
    expect(outs("unbalanced", "AND")).toEqual([0, 0, 0, 0, 1, 1, 0, 1, 2]);
  });
  it("OR = MAX", () => {
    expect(outs("unbalanced", "OR")).toEqual([0, 1, 2, 1, 1, 2, 2, 2, 2]);
  });
  it("NAND = 2-MIN", () => {
    expect(outs("unbalanced", "NAND")).toEqual([2, 2, 2, 2, 1, 1, 2, 1, 0]);
  });
  it("NOR = 2-MAX", () => {
    expect(outs("unbalanced", "NOR")).toEqual([2, 1, 0, 1, 1, 0, 0, 0, 0]);
  });
  it("XNOR (AXIOM-defined, conjugate of balanced a·b)", () => {
    expect(outs("unbalanced", "XNOR")).toEqual([2, 1, 0, 1, 1, 1, 0, 1, 2]);
  });
  it("XOR = NOT(XNOR) (AXIOM-defined)", () => {
    expect(outs("unbalanced", "XOR")).toEqual([0, 1, 2, 1, 1, 1, 2, 1, 0]);
  });
  it("SUM = (a+b) mod 3", () => {
    expect(outs("unbalanced", "SUM")).toEqual([0, 1, 2, 1, 2, 0, 2, 0, 1]);
  });
  it("CARRY = floor((a+b)/3)", () => {
    expect(outs("unbalanced", "CARRY")).toEqual([0, 0, 0, 0, 0, 1, 0, 1, 1]);
  });
  it("COMPARE = sign(a-b)", () => {
    expect(outs("unbalanced", "COMPARE")).toEqual([0, -1, -1, 1, 0, -1, 1, 1, 0]);
  });
});

describe("gate algebra holds across all rows (both systems)", () => {
  const systems = ["balanced", "unbalanced"] as const;
  // NOT is unary, but the gate maps are typed binary (a,b)=>Trit; wrap it into a
  // unary fn (dummy 2nd arg, which NOT ignores) so call sites below stay 1-arg.
  const NOT = (s: "balanced" | "unbalanced") => {
    const gate = s === "balanced" ? balancedGates.NOT : unbalancedGates.NOT;
    return (a: number): number => gate(a as never, a as never);
  };
  const G = (s: "balanced" | "unbalanced") =>
    s === "balanced" ? balancedGates : unbalancedGates;

  it("NAND=NOT∘AND, NOR=NOT∘OR, XOR=NOT∘XNOR, SUM+CARRY reconstruct a+b", () => {
    for (const s of systems) {
      const g = G(s);
      const not = NOT(s);
      const vals = s === "balanced" ? [-1, 0, 1] : [0, 1, 2];
      for (const a of vals)
        for (const b of vals) {
          expect(g.NAND(a as never, b as never)).toBe(not(g.AND(a as never, b as never)));
          expect(g.NOR(a as never, b as never)).toBe(not(g.OR(a as never, b as never)));
          expect(g.XOR(a as never, b as never)).toBe(not(g.XNOR(a as never, b as never)));
          const sum = g.SUM(a as never, b as never);
          const carry = g.CARRY(a as never, b as never);
          expect(3 * carry + sum).toBe(a + b); // half-adder reconstructs a+b
        }
    }
  });

  it("every gate's truth table has exactly 3^arity rows", () => {
    for (const s of systems)
      for (const name of Object.keys(GATE_ARITY) as GateName[])
        expect(truthTableFor(s, name).length).toBe(3 ** GATE_ARITY[name]);
  });
});
