// Balanced-ternary arithmetic implemented NATIVELY on trit arrays (not by
// decoding to a JS number and adding). The digit-by-digit adder is the visible
// algorithm the UI step-visualizer renders; everything else is built on it.
//
// Correctness oracle (see tests): decode(add(A,B)) === decode(A) + decode(B).
//
// OVERFLOW POLICY: WIDEN, not wrap. Results grow the vector by at most one trit
// (the final carry); there is no fixed word width and no silent overflow. A
// caller wanting a fixed-width word can normalize/truncate on its own.

import { Trit, TritVector, assertSystem, normalize } from "./trit";

export interface AddStep {
  index: number; // 3^index place
  a: Trit; // digit of A at this place (0 if past its end)
  b: Trit; // digit of B at this place
  carryIn: -1 | 0 | 1;
  sum: number; // a + b + carryIn ∈ [-3, 3]
  digit: -1 | 0 | 1; // resulting balanced trit at this place
  carryOut: -1 | 0 | 1;
}

/** The one traced adder. Records per-place {a,b,carryIn,sum,digit,carryOut}
 *  so a UI can animate the carry chain. add() is just this without the trace. */
export function addTrace(
  a: TritVector,
  b: TritVector,
): { result: TritVector; steps: AddStep[] } {
  assertSystem(a, "balanced");
  assertSystem(b, "balanced");
  const n = Math.max(a.length, b.length);
  const steps: AddStep[] = [];
  const result: Trit[] = [];
  let carry: -1 | 0 | 1 = 0;
  for (let i = 0; i < n; i++) {
    const ai = (a[i] ?? 0) as Trit;
    const bi = (b[i] ?? 0) as Trit;
    const sum = ai + bi + carry; // ∈ [-3, 3]
    let digit: number = sum;
    let carryOut: -1 | 0 | 1 = 0;
    if (digit > 1) {
      digit -= 3;
      carryOut = 1;
    } else if (digit < -1) {
      digit += 3;
      carryOut = -1;
    }
    steps.push({ index: i, a: ai, b: bi, carryIn: carry, sum, digit: digit as -1 | 0 | 1, carryOut });
    result.push(digit as Trit);
    carry = carryOut;
  }
  if (carry !== 0) {
    steps.push({ index: n, a: 0, b: 0, carryIn: carry, sum: carry, digit: carry, carryOut: 0 });
    result.push(carry);
  }
  return { result: normalize(result), steps };
}

export const add = (a: TritVector, b: TritVector): TritVector =>
  addTrace(a, b).result;

/** Balanced negation: flip the sign of every digit. Exact and carry-free.
 *  `0 - x` (not `-x`) keeps zero as +0 so vectors stay equality-comparable. */
export const neg = (t: TritVector): TritVector => t.map((x) => (0 - x) as Trit);

export const sub = (a: TritVector, b: TritVector): TritVector => add(a, neg(b));

export const inc = (t: TritVector): TritVector => add(t, [1]);
export const dec = (t: TritVector): TritVector => add(t, [-1]);

/** Sign of a balanced number = sign of its highest-order nonzero trit. */
export function sign(t: TritVector): -1 | 0 | 1 {
  for (let i = t.length - 1; i >= 0; i--) {
    if (t[i] > 0) return 1;
    if (t[i] < 0) return -1;
  }
  return 0;
}

/** Compare by value: -1 if a<b, 0 if equal, +1 if a>b. */
export const compare = (a: TritVector, b: TritVector): -1 | 0 | 1 =>
  sign(sub(a, b));

// Multiply by 3^k = shift toward higher places = prepend k zeros (little-endian).
const shiftLeft = (t: TritVector, k: number): TritVector =>
  k === 0 ? t : [...(Array(k).fill(0) as Trit[]), ...t];

/** Schoolbook multiply. Each multiplier digit ∈ {-1,0,1}, so a partial product
 *  is just the (shifted) multiplicand, negated when the digit is -1. */
export function mul(a: TritVector, b: TritVector): TritVector {
  assertSystem(a, "balanced");
  assertSystem(b, "balanced");
  let acc: TritVector = [];
  for (let j = 0; j < b.length; j++) {
    const bj = b[j];
    if (bj === 0) continue;
    const partial = shiftLeft(a, j);
    acc = add(acc, bj === 1 ? partial : neg(partial));
  }
  return normalize(acc);
}
