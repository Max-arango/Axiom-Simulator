import { describe, it, expect } from "vitest";
import { expandComposite, qftOps, BUILTIN_COMPOSITES, type CompositeDef } from "./composites.ts";
import { zeroState, applyOperation, probabilities, norm2 } from "./statevector.ts";

const near = (a: number, b: number) => expect(a).toBeCloseTo(b, 6);

function fold(ops: { gate: string; qubits: number[]; params?: unknown }[], n: number) {
  let s = zeroState(n);
  for (const op of ops) s = applyOperation(s, op as never, n);
  return s;
}

describe("composites", () => {
  it("QFT on |0…0⟩ gives the uniform superposition", () => {
    for (const nq of [2, 3]) {
      const s = fold(qftOps(nq), nq);
      const p = probabilities(s);
      const dim = 1 << nq;
      for (let i = 0; i < dim; i++) near(p[i], 1 / dim);
      near(norm2(s), 1);
    }
  });

  it("expandComposite remaps local qubits onto physical qubits", () => {
    const def: CompositeDef = { id: "t", name: "t", qubits: 2, ops: [{ gate: "H", qubits: [0] }, { gate: "CX", qubits: [0, 1] }] };
    const ops = expandComposite(def, 2); // stamp starting at physical qubit 2
    expect(ops[0].qubits).toEqual([2]);
    expect(ops[1].qubits).toEqual([2, 3]);
  });

  it("expandComposite shifts clbit / condition / openControls too", () => {
    const def: CompositeDef = {
      id: "t", name: "t", qubits: 2,
      ops: [
        { gate: "M", qubits: [0], clbit: 0 },
        { gate: "X", qubits: [1], condition: { clbit: 0, value: 1 }, openControls: [] },
      ],
    };
    const ops = expandComposite(def, 1);
    expect(ops[0].qubits).toEqual([1]);
    expect(ops[0].clbit).toBe(1);
    expect(ops[1].condition).toEqual({ clbit: 1, value: 1 });
  });

  it("built-in Bell composite expands to the Bell circuit", () => {
    const bell = BUILTIN_COMPOSITES.find((c) => c.id === "bell")!;
    const s = fold(expandComposite(bell, 0), 2);
    const p = probabilities(s);
    near(p[0], 0.5);
    near(p[3], 0.5);
  });

  it("every built-in has ops over local qubits < its arity", () => {
    for (const c of BUILTIN_COMPOSITES) {
      for (const op of c.ops) for (const q of op.qubits) {
        expect(q).toBeGreaterThanOrEqual(0);
        expect(q).toBeLessThan(c.qubits);
      }
    }
  });
});
