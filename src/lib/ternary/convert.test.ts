import { describe, it, expect } from "vitest";
import {
  decimalToBalanced,
  balancedToDecimal,
  decimalToUnbalanced,
  unbalancedToDecimal,
  balancedToUnbalanced,
  unbalancedToBalanced,
  encode,
  decode,
  toSystem,
} from "./convert.ts";
import { normalize, equals } from "./trit.ts";

describe("balanced round-trip is exact over -1000..1000", () => {
  it("decode(encode(n)) === n and digits are all balanced", () => {
    for (let n = -1000; n <= 1000; n++) {
      const t = decimalToBalanced(n);
      expect(balancedToDecimal(t)).toBe(n);
      for (const d of t) expect(d === -1 || d === 0 || d === 1).toBe(true);
    }
  });

  it("zero canonicalizes to the empty vector", () => {
    expect(decimalToBalanced(0)).toEqual([]);
    expect(balancedToDecimal([])).toBe(0);
  });

  it("known encodings (little-endian, index 0 = 3^0)", () => {
    expect(decimalToBalanced(1)).toEqual([1]);
    expect(decimalToBalanced(-1)).toEqual([-1]);
    expect(decimalToBalanced(2)).toEqual([-1, 1]); // -1 + 3
    expect(decimalToBalanced(3)).toEqual([0, 1]); // 3
    expect(decimalToBalanced(-2)).toEqual([1, -1]); // 1 - 3
  });
});

describe("unbalanced round-trip is exact over 0..2000", () => {
  it("decode(encode(n)) === n and digits are all in {0,1,2}", () => {
    for (let n = 0; n <= 2000; n++) {
      const t = decimalToUnbalanced(n);
      expect(unbalancedToDecimal(t)).toBe(n);
      for (const d of t) expect(d === 0 || d === 1 || d === 2).toBe(true);
    }
  });

  it("is unsigned: negative n throws", () => {
    expect(() => decimalToUnbalanced(-1)).toThrow();
  });

  it("known encodings", () => {
    expect(decimalToUnbalanced(0)).toEqual([]);
    expect(decimalToUnbalanced(5)).toEqual([2, 1]); // 2 + 3
    expect(decimalToUnbalanced(9)).toEqual([0, 0, 1]); // 9
  });
});

describe("cross-system conversion preserves value", () => {
  it("balanced <-> unbalanced agree on decimal for 0..1500", () => {
    for (let n = 0; n <= 1500; n++) {
      const bal = decimalToBalanced(n);
      const unb = decimalToUnbalanced(n);
      expect(unbalancedToDecimal(balancedToUnbalanced(bal))).toBe(n);
      expect(balancedToDecimal(unbalancedToBalanced(unb))).toBe(n);
    }
  });

  it("balanced->unbalanced throws on negative value (unrepresentable)", () => {
    expect(() => balancedToUnbalanced(decimalToBalanced(-4))).toThrow();
  });
});

describe("edge cases", () => {
  it("decode validates digits: a -1 in an unbalanced vector throws", () => {
    expect(() => unbalancedToDecimal([-1 as never])).toThrow();
  });

  it("decode validates digits: a 2 in a balanced vector throws", () => {
    expect(() => balancedToDecimal([2 as never])).toThrow();
  });

  it("leading (high-order) zeros are value-neutral and normalize away", () => {
    expect(balancedToDecimal([1, 0, 0])).toBe(1);
    expect(unbalancedToDecimal([2, 0, 0, 0])).toBe(2);
    expect(normalize([1, 0, 0])).toEqual([1]);
    expect(equals([1, 0, 0], [1])).toBe(true);
    expect(equals([0], [])).toBe(true);
  });

  it("non-integer input throws", () => {
    expect(() => decimalToBalanced(1.5)).toThrow();
    expect(() => decimalToUnbalanced(2.7)).toThrow();
  });
});

describe("tagged TernaryNumber layer", () => {
  it("encode/decode/toSystem preserve value across a range", () => {
    for (let n = -300; n <= 300; n++) {
      expect(decode(encode(n, "balanced"))).toBe(n);
      if (n >= 0) {
        expect(decode(encode(n, "unbalanced"))).toBe(n);
        expect(decode(toSystem(encode(n, "balanced"), "unbalanced"))).toBe(n);
        expect(decode(toSystem(encode(n, "unbalanced"), "balanced"))).toBe(n);
      }
    }
  });
});
