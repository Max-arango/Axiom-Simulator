// Decimal <-> ternary conversion. EXACT round-trip is the core correctness
// property: for every integer n, decode(encode(n)) === n.
//
// Integer-only. JS numbers are exact up to 2^53; 3^33 ≈ 5.5e15 < 2^53, so
// vectors up to ~33 trits decode exactly. Callers staying under that are safe.

import {
  System,
  TernaryNumber,
  Trit,
  TritVector,
  assertSystem,
} from "./trit";

// --- balanced (signed) ---

/** Encode any integer (negative, zero, positive) as balanced ternary.
 *  n = Σ trits[i]·3^i with trits[i] ∈ {-1,0,1}. */
export function decimalToBalanced(n: number): TritVector {
  if (!Number.isInteger(n)) throw new RangeError(`not an integer: ${n}`);
  const out: Trit[] = [];
  while (n !== 0) {
    // rem ∈ {0,1,2}; balanced digit maps 2 → -1 (borrow up), else identity.
    const rem = ((n % 3) + 3) % 3;
    const digit: Trit = rem === 2 ? -1 : (rem as Trit);
    out.push(digit);
    n = (n - digit) / 3; // exact: (n - digit) is divisible by 3 by construction
  }
  return out;
}

export function balancedToDecimal(trits: TritVector): number {
  assertSystem(trits, "balanced");
  let value = 0;
  let pow = 1;
  for (let i = 0; i < trits.length; i++) {
    value += trits[i] * pow;
    pow *= 3;
  }
  return value;
}

// --- unbalanced (unsigned, plain base-3) ---

/** Encode n ≥ 0 as plain base-3. Domain is unsigned: negative n throws,
 *  because {0,1,2} digits cannot represent a sign. */
export function decimalToUnbalanced(n: number): TritVector {
  if (!Number.isInteger(n)) throw new RangeError(`not an integer: ${n}`);
  if (n < 0) throw new RangeError(`unbalanced ternary is unsigned; got ${n}`);
  const out: Trit[] = [];
  while (n > 0) {
    out.push((n % 3) as Trit);
    n = Math.floor(n / 3);
  }
  return out;
}

export function unbalancedToDecimal(trits: TritVector): number {
  assertSystem(trits, "unbalanced");
  let value = 0;
  let pow = 1;
  for (let i = 0; i < trits.length; i++) {
    value += trits[i] * pow;
    pow *= 3;
  }
  return value;
}

// --- cross-system (value-preserving) ---
// Routed through the exact decimal value: integers convert losslessly, so a
// dedicated digit-shuffling algorithm would add code without adding accuracy.

/** balanced → unbalanced. Throws if the value is negative (unrepresentable). */
export function balancedToUnbalanced(trits: TritVector): TritVector {
  return decimalToUnbalanced(balancedToDecimal(trits));
}

/** unbalanced → balanced. Always representable. */
export function unbalancedToBalanced(trits: TritVector): TritVector {
  return decimalToBalanced(unbalancedToDecimal(trits));
}

// --- tagged-number helpers (the "one conceptual state" layer) ---

export const decode = (n: TernaryNumber): number =>
  n.system === "balanced"
    ? balancedToDecimal(n.trits)
    : unbalancedToDecimal(n.trits);

export const encode = (value: number, system: System): TernaryNumber => ({
  system,
  trits:
    system === "balanced"
      ? decimalToBalanced(value)
      : decimalToUnbalanced(value),
});

/** Re-express a number in the other (or same) system, value preserved. */
export const toSystem = (n: TernaryNumber, target: System): TernaryNumber =>
  n.system === target ? n : encode(decode(n), target);
