import { describe, it, expect } from "vitest";
import { add, mul, conj, type Complex } from "../mathlab/complex/complex.ts";
import { GATES, gateMatrix } from "./gates.ts";
import type { GateId, GateParams, Mat2 } from "./types.ts";

// Small 2×2 complex helpers, local to the test so the source stays lean.
const mat2mul = (A: Mat2, B: Mat2): Mat2 => [
  [add(mul(A[0][0], B[0][0]), mul(A[0][1], B[1][0])), add(mul(A[0][0], B[0][1]), mul(A[0][1], B[1][1]))],
  [add(mul(A[1][0], B[0][0]), mul(A[1][1], B[1][0])), add(mul(A[1][0], B[0][1]), mul(A[1][1], B[1][1]))],
];
const dagger = (A: Mat2): Mat2 => [
  [conj(A[0][0]), conj(A[1][0])],
  [conj(A[0][1]), conj(A[1][1])],
];
const near = (z: Complex, re: number, im: number) => {
  expect(z.re).toBeCloseTo(re, 6);
  expect(z.im).toBeCloseTo(im, 6);
};

describe("gate matrices — exact values", () => {
  it("Pauli-X, Y, Z", () => {
    const X = gateMatrix("X");
    near(X[0][0], 0, 0); near(X[0][1], 1, 0); near(X[1][0], 1, 0); near(X[1][1], 0, 0);
    const Y = gateMatrix("Y");
    near(Y[0][1], 0, -1); near(Y[1][0], 0, 1);
    const Z = gateMatrix("Z");
    near(Z[0][0], 1, 0); near(Z[1][1], -1, 0);
  });
  it("Hadamard is (1/√2)[[1,1],[1,-1]]", () => {
    const H = gateMatrix("H"), r = Math.SQRT1_2;
    near(H[0][0], r, 0); near(H[0][1], r, 0); near(H[1][0], r, 0); near(H[1][1], -r, 0);
  });
  it("S, T diagonal phases", () => {
    near(gateMatrix("S")[1][1], 0, 1);
    near(gateMatrix("Sdg")[1][1], 0, -1);
    near(gateMatrix("T")[1][1], Math.SQRT1_2, Math.SQRT1_2); // e^{iπ/4}
    near(gateMatrix("Tdg")[1][1], Math.SQRT1_2, -Math.SQRT1_2);
  });
  it("parametric matrices at sample angles", () => {
    near(gateMatrix("RX", { theta: Math.PI })[0][1], 0, -1); // -i·sin(π/2)
    near(gateMatrix("RY", { theta: Math.PI })[1][0], 1, 0); // sin(π/2)
    near(gateMatrix("RZ", { theta: Math.PI / 2 })[1][1], Math.SQRT1_2, Math.SQRT1_2); // e^{iπ/4}
    near(gateMatrix("PHASE", { theta: 0, phi: Math.PI / 2 })[1][1], 0, 1);
  });
});

describe("every gate matrix is unitary (U·U† ≈ I)", () => {
  const samples: GateParams = { theta: 0.7, phi: 1.3 };
  const withMatrix = (Object.keys(GATES) as GateId[]).filter((id) => GATES[id].matrix);
  for (const id of withMatrix) {
    it(`${id} is unitary`, () => {
      const U = gateMatrix(id, samples);
      const P = mat2mul(U, dagger(U));
      near(P[0][0], 1, 0); near(P[0][1], 0, 0);
      near(P[1][0], 0, 0); near(P[1][1], 1, 0);
    });
  }
});

describe("registry shape", () => {
  it("controlled gates expose their base target matrix; swap/measure do not", () => {
    expect(GATES.CX.kind).toBe("controlled");
    near(gateMatrix("CX")[0][1], 1, 0); // base is X
    near(gateMatrix("CZ")[1][1], -1, 0); // base is Z
    expect(GATES.CCX.arity).toBe(3);
    expect(GATES.SWAP.matrix).toBeUndefined();
    expect(GATES.M.matrix).toBeUndefined();
    expect(() => gateMatrix("SWAP")).toThrow();
    expect(() => gateMatrix("M")).toThrow();
  });
});
