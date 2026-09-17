import { describe, it, expect } from "vitest";
import { type Complex } from "../mathlab/complex/complex.ts";
import type { Operation, StateVector } from "./types.ts";
import {
  zeroState, applyOperation, applyMat2, applyControlled, applySwap,
  probabilities, norm2, normalize,
} from "./statevector.ts";
import { gateMatrix } from "./gates.ts";

const R2 = Math.SQRT1_2;
const near = (z: Complex, re: number, im: number) => {
  expect(z.re).toBeCloseTo(re, 6);
  expect(z.im).toBeCloseTo(im, 6);
};
// Apply a chain of ops to a fresh n-qubit zero state.
const run = (n: number, ops: Operation[]): StateVector =>
  ops.reduce((s, op) => applyOperation(s, op, n), zeroState(n));
const op = (gate: Operation["gate"], qubits: number[], params?: Operation["params"]): Operation =>
  ({ gate, qubits, params });

describe("single-qubit basis actions", () => {
  it("X flips |0⟩↔|1⟩", () => {
    const s1 = run(1, [op("X", [0])]);
    near(s1[0], 0, 0); near(s1[1], 1, 0);
    const s0 = applyOperation(s1, op("X", [0]), 1);
    near(s0[0], 1, 0); near(s0[1], 0, 0);
  });
  it("H|0⟩ = (|0⟩+|1⟩)/√2", () => {
    const s = run(1, [op("H", [0])]);
    near(s[0], R2, 0); near(s[1], R2, 0);
  });
  it("Z|1⟩ = -|1⟩", () => {
    const s = run(1, [op("X", [0]), op("Z", [0])]);
    near(s[0], 0, 0); near(s[1], -1, 0);
  });
  it("Y|0⟩ = i|1⟩", () => {
    const s = run(1, [op("Y", [0])]);
    near(s[0], 0, 0); near(s[1], 0, 1);
  });
  it("S|1⟩ = i|1⟩", () => {
    const s = run(1, [op("X", [0]), op("S", [0])]);
    near(s[1], 0, 1);
  });
  it("T|1⟩ = e^{iπ/4}|1⟩", () => {
    const s = run(1, [op("X", [0]), op("T", [0])]);
    near(s[1], Math.cos(Math.PI / 4), Math.sin(Math.PI / 4));
  });
});

describe("parametric rotations", () => {
  it("RX(π)|0⟩ ≈ -i|1⟩", () => {
    const s = run(1, [op("RX", [0], { theta: Math.PI })]);
    near(s[0], 0, 0); near(s[1], 0, -1);
  });
  it("RY(π)|0⟩ ≈ |1⟩", () => {
    const s = run(1, [op("RY", [0], { theta: Math.PI })]);
    near(s[0], 0, 0); near(s[1], 1, 0);
  });
  it("RZ(π/2) phases each basis state", () => {
    const s0 = run(1, [op("RZ", [0], { theta: Math.PI / 2 })]);
    near(s0[0], Math.cos(-Math.PI / 4), Math.sin(-Math.PI / 4)); // e^{-iπ/4}|0⟩
    const s1 = run(1, [op("X", [0]), op("RZ", [0], { theta: Math.PI / 2 })]);
    near(s1[1], Math.cos(Math.PI / 4), Math.sin(Math.PI / 4)); // e^{iπ/4}|1⟩
  });
});

describe("entangling circuits (little-endian: qubit i = bit i of index)", () => {
  it("Bell H(0)·CX(0→1) → (|00⟩+|11⟩)/√2 at indices 0 and 3", () => {
    const s = run(2, [op("H", [0]), op("CX", [0, 1])]); // qubits=[control,target]
    near(s[0], R2, 0); // |q1=0,q0=0⟩
    near(s[1], 0, 0);
    near(s[2], 0, 0);
    near(s[3], R2, 0); // |q1=1,q0=1⟩
  });
  it("GHZ H(0)·CX(0→1)·CX(1→2) → only |000⟩ and |111⟩", () => {
    const s = run(3, [op("H", [0]), op("CX", [0, 1]), op("CX", [1, 2])]);
    const p = probabilities(s);
    for (let i = 0; i < 8; i++) {
      const want = i === 0 || i === 7 ? 0.5 : 0;
      expect(p[i]).toBeCloseTo(want, 6);
    }
    near(s[0], R2, 0); near(s[7], R2, 0);
  });
});

describe("Toffoli truth table (CCX, qubits=[c0,c1,target])", () => {
  // target (qubit 2) flips iff both controls (qubits 0,1) are 1.
  const cases: Array<[number, number, number]> = [
    [0, 0, 0], [0, 1, 0], [1, 0, 0], [1, 1, 1],
  ];
  for (const [c0, c1, out] of cases) {
    it(`c0=${c0} c1=${c1} → target=${out}`, () => {
      const prep: Operation[] = [];
      if (c0) prep.push(op("X", [0]));
      if (c1) prep.push(op("X", [1]));
      const s = run(3, [...prep, op("CCX", [0, 1, 2])]);
      const idx = c0 + (c1 << 1) + (out << 2); // little-endian assembled index
      near(s[idx], 1, 0);
      expect(norm2(s)).toBeCloseTo(1, 6);
    });
  }
});

describe("SWAP", () => {
  it("swaps single-qubit occupancy |01⟩ ↔ |10⟩", () => {
    // |q1=0,q0=1⟩ = index 1; after SWAP(0,1) → |q1=1,q0=0⟩ = index 2.
    const s = run(2, [op("X", [0]), op("SWAP", [0, 1])]);
    near(s[1], 0, 0); near(s[2], 1, 0);
  });
});

describe("norm & measurement no-op", () => {
  it("norm2 ≈ 1 after Bell and GHZ", () => {
    expect(norm2(run(2, [op("H", [0]), op("CX", [0, 1])]))).toBeCloseTo(1, 6);
    expect(norm2(run(3, [op("H", [0]), op("CX", [0, 1]), op("CX", [1, 2])]))).toBeCloseTo(1, 6);
  });
  it("normalize scales an unnormalized vector back to unit norm", () => {
    const scaled: StateVector = zeroState(1).map((z) => ({ re: z.re * 3, im: z.im * 3 }));
    expect(norm2(normalize(scaled))).toBeCloseTo(1, 6);
  });
  it("M is a no-op on the statevector", () => {
    const before = run(1, [op("H", [0])]);
    const after = applyOperation(before, op("M", [0]), 1);
    near(after[0], R2, 0); near(after[1], R2, 0);
  });
});

describe("guards", () => {
  it("rejects out-of-range indices and oversized registers", () => {
    expect(() => zeroState(7)).toThrow(); // > MAX_QUBITS
    expect(() => applyMat2(zeroState(1), gateMatrix("X"), 3, 1)).toThrow();
    expect(() => applyControlled(zeroState(2), gateMatrix("X"), [0], 0, 2)).toThrow(); // control==target
    expect(() => applySwap(zeroState(2), 0, 5, 2)).toThrow();
  });
});
