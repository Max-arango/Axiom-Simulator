import { describe, it, expect } from "vitest";
import type { Operation, StateVector } from "./types.ts";
import { zeroState, applyOperation } from "./statevector.ts";
import { qsphereNodes, phaseColor } from "./qsphere.ts";

const run = (n: number, ops: Operation[]): StateVector =>
  ops.reduce((s, op) => applyOperation(s, op, n), zeroState(n));

// Reference popcount, independent of the module's own implementation.
const popcount = (i: number): number => {
  let c = 0;
  for (let b = i; b > 0; b >>= 1) c += b & 1;
  return c;
};

describe("qsphereNodes", () => {
  it("n=1 |0⟩: index0 at north pole with prob 1, index1 at south pole", () => {
    const nodes = qsphereNodes(zeroState(1), 1);
    expect(nodes[0].z).toBeCloseTo(1, 6);
    expect(nodes[0].prob).toBeCloseTo(1, 6);
    expect(nodes[0].weight).toBe(0);
    expect(nodes[1].z).toBeCloseTo(-1, 6);
    expect(nodes[1].prob).toBeCloseTo(0, 6);
    expect(nodes[1].weight).toBe(1);
  });

  it("n=2 Bell: |00⟩ (north) and |11⟩ (south) carry prob 0.5, |01⟩/|10⟩ empty", () => {
    // H on q0, then CX control q0 → target q1 : (|00⟩+|11⟩)/√2.
    const bell = run(2, [
      { gate: "H", qubits: [0] },
      { gate: "CX", qubits: [0, 1] },
    ]);
    const nodes = qsphereNodes(bell, 2);
    expect(nodes[0].weight).toBe(0);
    expect(nodes[0].z).toBeCloseTo(1, 6);
    expect(nodes[0].prob).toBeCloseTo(0.5, 6);
    expect(nodes[3].weight).toBe(2);
    expect(nodes[3].z).toBeCloseTo(-1, 6);
    expect(nodes[3].prob).toBeCloseTo(0.5, 6);
    expect(nodes[1].prob).toBeCloseTo(0, 6);
    expect(nodes[2].prob).toBeCloseTo(0, 6);
    // Every node sits on the unit sphere.
    for (const nd of nodes) {
      expect(nd.x * nd.x + nd.y * nd.y + nd.z * nd.z).toBeCloseTo(1, 6);
    }
  });

  it("weight field is the popcount of the basis index (n=3)", () => {
    const nodes = qsphereNodes(zeroState(3), 3);
    for (let i = 0; i < 8; i++) expect(nodes[i].weight).toBe(popcount(i));
  });

  it("guards n outside [1,6]", () => {
    expect(() => qsphereNodes(zeroState(1), 0)).toThrow();
    expect(() => qsphereNodes(zeroState(1), 7)).toThrow();
  });
});

describe("phaseColor", () => {
  it("wraps: phaseColor(−π) ≈ phaseColor(π)", () => {
    const a = phaseColor(-Math.PI);
    const b = phaseColor(Math.PI);
    for (let i = 0; i < 3; i++) expect(a[i]).toBeCloseTo(b[i], 6);
  });

  it("returns three components, each in [0,1]", () => {
    for (const p of [-Math.PI, -1, 0, 1, Math.PI / 2, Math.PI]) {
      const c = phaseColor(p);
      expect(c).toHaveLength(3);
      for (const v of c) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
  });
});
