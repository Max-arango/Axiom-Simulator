import { describe, it, expect } from "vitest";
import {
  simulate,
  simulateSteps,
  validate,
  MAX_CIRCUIT_NODES,
  Circuit,
  Edge,
  CircuitNode,
} from "./circuit.ts";
import { balancedGates, unbalancedGates } from "./gates.ts";
import { System, Trit, tritValues } from "./trit.ts";

const gatesOf = (s: System) =>
  s === "balanced" ? balancedGates : unbalancedGates;

// --- Half-adder: A,B → SUM gate + CARRY gate → two outputs. -----------------
// The engine's own gate fns are the oracle.
function halfAdder(system: System, a: Trit, b: Trit): Circuit {
  const nodes: CircuitNode[] = [
    { id: "A", kind: "input" },
    { id: "B", kind: "input" },
    { id: "S", kind: "gate", gate: "SUM" },
    { id: "C", kind: "gate", gate: "CARRY" },
    { id: "outS", kind: "output" },
    { id: "outC", kind: "output" },
  ];
  const edges: Edge[] = [
    { from: "A", to: "S", port: 0 },
    { from: "B", to: "S", port: 1 },
    { from: "A", to: "C", port: 0 },
    { from: "B", to: "C", port: 1 },
    { from: "S", to: "outS", port: 0 },
    { from: "C", to: "outC", port: 0 },
  ];
  return { nodes, edges, inputs: { A: a, B: b }, system };
}

describe("half-adder circuit == gate oracle, all 9 pairs, both systems", () => {
  for (const system of ["balanced", "unbalanced"] as System[]) {
    it(`${system}: SUM/CARRY outputs match gates + reconstruct a+b`, () => {
      const g = gatesOf(system);
      for (const a of tritValues(system))
        for (const b of tritValues(system)) {
          const { values } = simulate(halfAdder(system, a, b));
          expect(values.S).toBe(g.SUM(a, b));
          expect(values.C).toBe(g.CARRY(a, b));
          // outputs pass their input through unchanged
          expect(values.outS).toBe(g.SUM(a, b));
          expect(values.outC).toBe(g.CARRY(a, b));
          // 3*carry + sum reconstructs the operand sum (holds in both systems)
          expect(3 * values.outC + values.outS).toBe(a + b);
        }
    });
  }
});

// --- NOT → NOT === identity, over all trits, both systems. ------------------
describe("NOT → NOT chain is the identity", () => {
  for (const system of ["balanced", "unbalanced"] as System[]) {
    it(`${system}`, () => {
      const c: Circuit = {
        nodes: [
          { id: "A", kind: "input" },
          { id: "n1", kind: "gate", gate: "NOT" },
          { id: "n2", kind: "gate", gate: "NOT" },
          { id: "out", kind: "output" },
        ],
        edges: [
          { from: "A", to: "n1", port: 0 },
          { from: "n1", to: "n2", port: 0 },
          { from: "n2", to: "out", port: 0 },
        ],
        inputs: {},
        system,
      };
      for (const a of tritValues(system)) {
        const { values } = simulate({ ...c, inputs: { A: a } });
        expect(values.out).toBe(a);
      }
    });
  }
});

// --- 2-level tree AND(AND(a,b), c) vs manual gate application. --------------
describe("2-level tree AND(AND(a,b),c) matches nested gate calls", () => {
  for (const system of ["balanced", "unbalanced"] as System[]) {
    it(`${system}`, () => {
      const g = gatesOf(system);
      const base: Circuit = {
        nodes: [
          { id: "A", kind: "input" },
          { id: "B", kind: "input" },
          { id: "C", kind: "input" },
          { id: "g1", kind: "gate", gate: "AND" },
          { id: "g2", kind: "gate", gate: "AND" },
          { id: "out", kind: "output" },
        ],
        edges: [
          { from: "A", to: "g1", port: 0 },
          { from: "B", to: "g1", port: 1 },
          { from: "g1", to: "g2", port: 0 },
          { from: "C", to: "g2", port: 1 },
          { from: "g2", to: "out", port: 0 },
        ],
        inputs: {},
        system,
      };
      for (const a of tritValues(system))
        for (const b of tritValues(system))
          for (const cc of tritValues(system)) {
            const { values } = simulate({ ...base, inputs: { A: a, B: b, C: cc } });
            expect(values.out).toBe(g.AND(g.AND(a, b), cc));
          }
    });
  }
});

// --- simulateSteps: frame count, last frame, no premature downstream. -------
describe("simulateSteps propagation frames", () => {
  it("frames.length === node count; last frame === simulate().values", () => {
    const c = halfAdder("balanced", 1, 1);
    const { frames, order } = simulateSteps(c);
    expect(frames.length).toBe(c.nodes.length);
    expect(order.length).toBe(c.nodes.length);
    expect(frames[frames.length - 1]).toEqual(simulate(c).values);
  });

  it("an earlier frame lacks downstream nodes", () => {
    const { frames, order } = simulateSteps(halfAdder("balanced", 1, -1));
    // frame k holds exactly k+1 evaluated nodes...
    frames.forEach((f, k) => expect(Object.keys(f).length).toBe(k + 1));
    // ...so the last-evaluated (downstream) node is absent from the first frame.
    expect(frames[0]).not.toHaveProperty(order[order.length - 1]);
  });
});

// --- Validation. -----------------------------------------------------------
describe("validation", () => {
  it("cycle throws (combinational only)", () => {
    const c: Circuit = {
      nodes: [
        { id: "n1", kind: "gate", gate: "NOT" },
        { id: "n2", kind: "gate", gate: "NOT" },
      ],
      edges: [
        { from: "n1", to: "n2", port: 0 },
        { from: "n2", to: "n1", port: 0 },
      ],
      inputs: {},
      system: "balanced",
    };
    expect(() => simulate(c)).toThrow(/cycle/);
    expect(validate(c).errors.some((e) => /cycle/.test(e))).toBe(true);
  });

  it("arity mismatch throws (gate wired with too few inputs)", () => {
    const c: Circuit = {
      nodes: [
        { id: "A", kind: "input" },
        { id: "g", kind: "gate", gate: "AND" },
        { id: "out", kind: "output" },
      ],
      edges: [
        { from: "A", to: "g", port: 0 },
        { from: "g", to: "out", port: 0 },
      ],
      inputs: { A: 1 },
      system: "balanced",
    };
    expect(() => simulate(c)).toThrow(/expects 2 input\(s\), got 1/);
  });

  it("over-MAX node count throws", () => {
    const nodes: CircuitNode[] = [];
    for (let i = 0; i <= MAX_CIRCUIT_NODES; i++)
      nodes.push({ id: `x${i}`, kind: "input" });
    const c: Circuit = { nodes, edges: [], inputs: {}, system: "balanced" };
    expect(nodes.length).toBeGreaterThan(MAX_CIRCUIT_NODES);
    expect(() => simulate(c)).toThrow(/too many nodes/);
  });

  it("edge to a missing node throws", () => {
    const c: Circuit = {
      nodes: [{ id: "A", kind: "input" }],
      edges: [{ from: "A", to: "ghost", port: 0 }],
      inputs: {},
      system: "balanced",
    };
    expect(() => simulate(c)).toThrow(/unknown node "ghost"/);
  });

  it("port out of range and double-wired port are reported", () => {
    const c: Circuit = {
      nodes: [
        { id: "A", kind: "input" },
        { id: "B", kind: "input" },
        { id: "g", kind: "gate", gate: "NOT" }, // arity 1 → only port 0
      ],
      edges: [
        { from: "A", to: "g", port: 0 },
        { from: "B", to: "g", port: 1 }, // out of range for arity 1
      ],
      inputs: {},
      system: "balanced",
    };
    const v = validate(c);
    expect(v.ok).toBe(false);
    expect(v.errors.some((e) => /out of range/.test(e))).toBe(true);
  });

  it("validate() returns errors WITHOUT throwing", () => {
    const c: Circuit = {
      nodes: [{ id: "g", kind: "gate", gate: "AND" }],
      edges: [],
      inputs: {},
      system: "balanced",
    };
    const v = validate(c); // must not throw
    expect(v.ok).toBe(false);
    expect(v.errors.length).toBeGreaterThan(0);
  });

  it("a valid circuit passes validate()", () => {
    expect(validate(halfAdder("balanced", 0, 0)).ok).toBe(true);
    expect(validate(halfAdder("unbalanced", 2, 2)).ok).toBe(true);
  });
});
