// Core trit types for the AXIOM Ternary Engine. Pure stdlib TS, zero deps.
//
// One conceptual state, two representations of the SAME integer:
//   - "balanced"   digits ∈ {-1, 0, +1}  → represents any integer (signed).
//   - "unbalanced" digits ∈ { 0, 1, 2 }  → represents n ≥ 0 (unsigned, plain base-3).
// Switching systems must never change the represented value (see convert.ts).
//
// ENDIANNESS: little-endian. trits[0] is the 3^0 place, trits[i] the 3^i place.
// Chosen because carry propagates from low → high index, which keeps the
// digit-by-digit adder (arith.ts) readable as a left-to-right array walk.
//
// CANONICAL FORM: high-order (highest-index) zeros are insignificant.
// normalize() strips them; the integer 0 canonicalizes to the empty vector [].

export type System = "balanced" | "unbalanced";

export type BalancedTrit = -1 | 0 | 1;
export type UnbalancedTrit = 0 | 1 | 2;
/** A single trit; the valid subset depends on the system it belongs to. */
export type Trit = -1 | 0 | 1 | 2;

/** A little-endian sequence of trits (variable width). A fixed-width word is
 *  just a TritVector whose length is held constant by the caller. */
export type TritVector = Trit[];

/** A ternary number = digits + the system tag that gives them meaning. */
export interface TernaryNumber {
  system: System;
  trits: TritVector;
}

export const isBalancedTrit = (t: number): t is BalancedTrit =>
  t === -1 || t === 0 || t === 1;

export const isUnbalancedTrit = (t: number): t is UnbalancedTrit =>
  t === 0 || t === 1 || t === 2;

/** The ordered list of legal digits for a system: [-1,0,1] or [0,1,2]. */
export const tritValues = (system: System): Trit[] =>
  system === "balanced" ? [-1, 0, 1] : [0, 1, 2];

/** Throw if any digit is illegal for the system. Used at decode/build
 *  boundaries so e.g. a -1 in an unbalanced vector fails loudly. */
export function assertSystem(trits: TritVector, system: System): void {
  const ok = system === "balanced" ? isBalancedTrit : isUnbalancedTrit;
  for (let i = 0; i < trits.length; i++) {
    if (!ok(trits[i])) {
      throw new RangeError(`invalid ${system} trit ${trits[i]} at index ${i}`);
    }
  }
}

/** Drop insignificant high-order zeros. Zero → []. */
export function normalize(trits: TritVector): TritVector {
  let end = trits.length;
  while (end > 0 && trits[end - 1] === 0) end--;
  return trits.slice(0, end);
}

/** Value-equality of two vectors (same system assumed) via canonical form. */
export function equals(a: TritVector, b: TritVector): boolean {
  const x = normalize(a);
  const y = normalize(b);
  if (x.length !== y.length) return false;
  for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return false;
  return true;
}
