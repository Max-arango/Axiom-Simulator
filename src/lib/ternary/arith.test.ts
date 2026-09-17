import { describe, it, expect } from "vitest";
import { decimalToBalanced, balancedToDecimal } from "./convert.ts";
import { add, addTrace, sub, mul, neg, inc, dec, sign, compare } from "./arith.ts";

const E = decimalToBalanced; // encode
const D = balancedToDecimal; // decode

// A dense set of signed operands, including zero and both signs.
const OPS: number[] = [];
for (let n = -60; n <= 60; n++) OPS.push(n);
OPS.push(-729, -243, -100, 121, 242, 500, 728, 1093);

describe("native balanced arithmetic == decimal oracle", () => {
  it("add: decode(add(A,B)) === a + b for all pairs", () => {
    for (const a of OPS)
      for (const b of OPS) expect(D(add(E(a), E(b)))).toBe(a + b);
  });

  it("sub: decode(sub(A,B)) === a - b for all pairs", () => {
    for (const a of OPS)
      for (const b of OPS) expect(D(sub(E(a), E(b)))).toBe(a - b);
  });

  it("mul: decode(mul(A,B)) === a * b for all pairs", () => {
    // `|| 0` on the oracle: JS `-5 * 0` is -0; the engine returns +0.
    for (const a of OPS)
      for (const b of OPS) expect(D(mul(E(a), E(b)))).toBe(a * b || 0);
  });

  it("neg / inc / dec", () => {
    for (const a of OPS) {
      expect(D(neg(E(a)))).toBe(-a || 0); // `|| 0`: oracle -0 vs engine +0

      expect(D(inc(E(a)))).toBe(a + 1);
      expect(D(dec(E(a)))).toBe(a - 1);
    }
  });

  it("compare / sign match numeric ordering", () => {
    for (const a of OPS) {
      expect(sign(E(a))).toBe(Math.sign(a));
      for (const b of OPS) expect(compare(E(a), E(b))).toBe(Math.sign(a - b));
    }
  });
});

describe("carry behaviour", () => {
  it("1 + 1 = 2 carries into the 3^1 place: [-1, 1]", () => {
    expect(add([1], [1])).toEqual([-1, 1]);
    expect(D(add([1], [1]))).toBe(2);
  });

  it("carry chain: 13 + 13 = 26", () => {
    // 13 = [1,1,1] (1+3+9); 26 = [-1,0,0,1] (-1+27)
    expect(add(E(13), E(13))).toEqual([-1, 0, 0, 1]);
    expect(D(add(E(13), E(13)))).toBe(26);
  });

  it("addTrace: every step satisfies sum = a+b+carryIn = 3*carryOut + digit", () => {
    const { steps } = addTrace(E(40), E(40));
    for (const s of steps) {
      expect(s.sum).toBe(s.a + s.b + s.carryIn);
      expect(s.sum).toBe(3 * s.carryOut + s.digit);
    }
  });
});

describe("overflow policy = WIDEN (no wrap)", () => {
  it("result grows by at most one trit over the wider operand", () => {
    for (const a of OPS)
      for (const b of OPS) {
        const A = E(a),
          B = E(b);
        const r = add(A, B);
        expect(r.length).toBeLessThanOrEqual(Math.max(A.length, B.length) + 1);
        expect(D(r)).toBe(a + b); // value still exact, nothing wrapped
      }
  });
});

describe("edge cases", () => {
  it("zero vectors add/mul cleanly", () => {
    expect(add([], [])).toEqual([]);
    expect(add([], E(7))).toEqual(E(7));
    expect(mul([], E(7))).toEqual([]);
    expect(mul(E(7), [])).toEqual([]);
    expect(sign([])).toBe(0);
    expect(compare([], [])).toBe(0);
  });

  it("results are normalized (no trailing high-order zeros)", () => {
    const r = sub(E(5), E(5));
    expect(r).toEqual([]);
    const r2 = add(E(4), E(-1));
    expect(r2[r2.length - 1]).not.toBe(0);
  });

  it("add rejects non-balanced input (a 2 digit)", () => {
    expect(() => add([2 as never], [1])).toThrow();
  });
});
