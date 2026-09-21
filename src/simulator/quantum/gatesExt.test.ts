import { describe, it, expect } from "vitest";
import { C, mul, add, conj } from "../mathlab/complex/complex.ts";
import { gateMatrix, gateMatrix4 } from "./gates.ts";
import { zeroState, applyOperation, applyMat2, probabilities } from "./statevector.ts";
import type { Mat2, Mat4 } from "./types.ts";

const near = (a: number, b: number) => expect(a).toBeCloseTo(b, 6);

// |ψ⟩ helpers
const s2 = () => zeroState(2);
const ampNear = (state: { re: number; im: number }[], i: number, re: number, im: number) => {
  near(state[i].re, re);
  near(state[i].im, im);
};

// unitarity: M · M† ≈ I
function unitary2(m: Mat2) {
  for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++) {
    let acc = C(0);
    for (let k = 0; k < 2; k++) acc = add(acc, mul(m[r][k], conj(m[c][k])));
    near(acc.re, r === c ? 1 : 0);
    near(acc.im, 0);
  }
}
function unitary4(m: Mat4) {
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
    let acc = C(0);
    for (let k = 0; k < 4; k++) acc = add(acc, mul(m[r][k], conj(m[c][k])));
    near(acc.re, r === c ? 1 : 0);
    near(acc.im, 0);
  }
}

describe("new single-qubit gates", () => {
  it("SX·SX = X (√X)", () => {
    let s = zeroState(1);
    s = applyOperation(s, { gate: "SX", qubits: [0] }, 1);
    s = applyOperation(s, { gate: "SX", qubits: [0] }, 1);
    ampNear(s, 0, 0, 0);
    ampNear(s, 1, 1, 0); // |0⟩ → |1⟩
  });

  it("U3(π,0,π) = X and U3(π/2,0,π) = H on |0⟩", () => {
    let x = applyMat2(zeroState(1), gateMatrix("U3", { theta: Math.PI, phi: 0, lambda: Math.PI }), 0, 1);
    ampNear(x, 1, 1, 0);
    let h = applyMat2(zeroState(1), gateMatrix("U3", { theta: Math.PI / 2, phi: 0, lambda: Math.PI }), 0, 1);
    near(h[0].re, Math.SQRT1_2);
    near(h[1].re, Math.SQRT1_2);
  });

  it("SX, U3 matrices are unitary", () => {
    unitary2(gateMatrix("SX"));
    unitary2(gateMatrix("SXdg"));
    unitary2(gateMatrix("U3", { theta: 0.7, phi: 1.1, lambda: -0.4 }));
  });
});

describe("controlled parametric gates", () => {
  it("CP(θ) phases |11⟩ only", () => {
    // build |11⟩: X q0, X q1
    let s = s2();
    s = applyOperation(s, { gate: "X", qubits: [0] }, 2);
    s = applyOperation(s, { gate: "X", qubits: [1] }, 2);
    const th = 0.9;
    s = applyOperation(s, { gate: "CP", qubits: [0, 1], params: { theta: th } }, 2);
    ampNear(s, 3, Math.cos(th), Math.sin(th)); // |11⟩ picked up e^{iθ}
  });

  it("CRX(π) acts on target only when control is |1⟩", () => {
    // control q0=1 (X q0), target q1
    let on = applyOperation(applyOperation(s2(), { gate: "X", qubits: [0] }, 2), { gate: "CRX", qubits: [0, 1], params: { theta: Math.PI } }, 2);
    // RX(π) = -iX ⇒ |q1=0⟩→ -i|q1=1⟩; state was |q1=0,q0=1⟩ (index1) → index3 with -i
    ampNear(on, 3, 0, -1);
    // control q0=0 ⇒ untouched
    const off = applyOperation(s2(), { gate: "CRX", qubits: [0, 1], params: { theta: Math.PI } }, 2);
    ampNear(off, 0, 1, 0);
  });
});

describe("two-qubit gates", () => {
  it("iSWAP: |q1=0,q0=1⟩ → i|q1=1,q0=0⟩", () => {
    let s = applyOperation(s2(), { gate: "X", qubits: [0] }, 2); // index 1
    s = applyOperation(s, { gate: "ISWAP", qubits: [0, 1] }, 2);
    ampNear(s, 2, 0, 1); // i at index 2
    ampNear(s, 1, 0, 0);
  });

  it("RZZ(θ) is diagonal with the right phases", () => {
    const th = 0.8;
    const s0 = applyOperation(s2(), { gate: "RZZ", qubits: [0, 1], params: { theta: th } }, 2);
    ampNear(s0, 0, Math.cos(th / 2), -Math.sin(th / 2)); // |00⟩ → e^{-iθ/2}
    let s1 = applyOperation(s2(), { gate: "X", qubits: [0] }, 2); // |q0=1⟩ index1
    s1 = applyOperation(s1, { gate: "RZZ", qubits: [0, 1], params: { theta: th } }, 2);
    ampNear(s1, 1, Math.cos(th / 2), Math.sin(th / 2)); // → e^{+iθ/2}
  });

  it("RXX(π)|00⟩ = -i|11⟩", () => {
    const s = applyOperation(s2(), { gate: "RXX", qubits: [0, 1], params: { theta: Math.PI } }, 2);
    ampNear(s, 3, 0, -1);
  });

  it("iSWAP, RXX, RYY, RZZ are unitary", () => {
    unitary4(gateMatrix4("ISWAP"));
    unitary4(gateMatrix4("RXX", { theta: 0.7 }));
    unitary4(gateMatrix4("RYY", { theta: 1.3 }));
    unitary4(gateMatrix4("RZZ", { theta: -0.5 }));
  });
});

describe("anti-control + barrier", () => {
  it("open control fires on |0⟩", () => {
    // anti-CX: control q0 open, target q1. |00⟩ (control=0) fires → flip q1 → index 2
    const s = applyOperation(s2(), { gate: "CX", qubits: [0, 1], openControls: [0] }, 2);
    ampNear(s, 2, 1, 0);
    // |q0=1⟩ (control=1) does NOT fire under anti-control → unchanged
    const s1 = applyOperation(applyOperation(s2(), { gate: "X", qubits: [0] }, 2), { gate: "CX", qubits: [0, 1], openControls: [0] }, 2);
    ampNear(s1, 1, 1, 0);
  });

  it("barrier is a no-op on the state", () => {
    let s = applyOperation(s2(), { gate: "H", qubits: [0] }, 2);
    const before = probabilities(s);
    s = applyOperation(s, { gate: "BARRIER", qubits: [0] }, 2);
    const afterP = probabilities(s);
    before.forEach((p, i) => near(afterP[i], p));
  });
});
