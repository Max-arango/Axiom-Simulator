// Single-trit ternary operators, per system, with documented semantics.
//
// LOGIC CONVENTION (Kleene / Łukasiewicz strong logic):
//   balanced   -1 = false, 0 = unknown, +1 = true
//   unbalanced  0 = false, 1 = unknown,  2 = true
// The two systems are conjugate under the value-preserving shift u = b + 1
// (unbalanced digit = balanced digit + 1); every unbalanced gate below is the
// balanced gate carried across that shift, so both reduce to ordinary boolean
// logic on their two-valued subset ({-1,+1} resp. {0,2}).
//
// AND = MIN and OR = MAX are the standard many-valued conjunction/disjunction.
// NOT is the standard involutive complement (-x resp. 2-x). SUM/CARRY are the
// two outputs of a single-digit half-adder. XOR/XNOR are AXIOM-defined (marked
// below) — ternary XOR is a design choice, not a universal standard.

import { System, Trit, tritValues } from "./trit";

export type GateName =
  | "NOT"
  | "AND"
  | "OR"
  | "NAND"
  | "NOR"
  | "XOR"
  | "XNOR"
  | "MIN"
  | "MAX"
  | "SUM"
  | "CARRY"
  | "COMPARE";

export const GATE_ARITY: Record<GateName, 1 | 2> = {
  NOT: 1,
  AND: 2,
  OR: 2,
  NAND: 2,
  NOR: 2,
  XOR: 2,
  XNOR: 2,
  MIN: 2,
  MAX: 2,
  SUM: 2,
  CARRY: 2,
  COMPARE: 2,
};

export const GATE_DOC: Record<GateName, string> = {
  NOT: "complement: -x (balanced) / 2-x (unbalanced)",
  AND: "MIN(a,b) — strong conjunction",
  OR: "MAX(a,b) — strong disjunction",
  NAND: "NOT(AND(a,b))",
  NOR: "NOT(OR(a,b))",
  XOR: "AXIOM-defined: NOT(XNOR); on the 2-valued subset = 'a differs from b'",
  XNOR: "AXIOM-defined: balanced a·b (product); on the 2-valued subset = 'a equals b'",
  MIN: "min(a,b)",
  MAX: "max(a,b)",
  SUM: "half-adder sum digit: (a+b) reduced into the system, no carry",
  CARRY: "half-adder carry: -1/0/+1 (balanced), 0/1 (unbalanced)",
  COMPARE: "sign(a-b) ∈ {-1,0,+1} — ordering result (always a balanced trit)",
};

// --- balanced gates (digits -1/0/+1) ---

// `0 - x` (not `-x`) so that negating zero yields +0, never -0 (which would
// break value-array equality checks downstream).
const bNOT = (a: Trit): Trit => (0 - a) as Trit;
const bMIN = (a: Trit, b: Trit): Trit => Math.min(a, b) as Trit;
const bMAX = (a: Trit, b: Trit): Trit => Math.max(a, b) as Trit;
// XNOR = a·b: for a,b ∈ {-1,+1} this is +1 iff equal, -1 iff different, and 0
// (unknown) absorbs — an "equality" operator. XOR is its complement.
const bXNOR = (a: Trit, b: Trit): Trit => ((a * b) || 0) as Trit; // `|| 0` kills -0
const bXOR = (a: Trit, b: Trit): Trit => (0 - a * b) as Trit;
const bSUM = (a: Trit, b: Trit): Trit => {
  let s = a + b; // ∈ [-2, 2]
  if (s > 1) s -= 3;
  else if (s < -1) s += 3;
  return s as Trit;
};
const bCARRY = (a: Trit, b: Trit): Trit => {
  const s = a + b;
  return (s > 1 ? 1 : s < -1 ? -1 : 0) as Trit;
};
const COMPARE = (a: Trit, b: Trit): Trit => Math.sign(a - b) as Trit;

export const balancedGates: Record<GateName, (a: Trit, b: Trit) => Trit> = {
  NOT: (a) => bNOT(a),
  AND: bMIN,
  OR: bMAX,
  NAND: (a, b) => bNOT(bMIN(a, b)),
  NOR: (a, b) => bNOT(bMAX(a, b)),
  XOR: bXOR,
  XNOR: bXNOR,
  MIN: bMIN,
  MAX: bMAX,
  SUM: bSUM,
  CARRY: bCARRY,
  COMPARE,
};

// --- unbalanced gates (digits 0/1/2) = balanced gates conjugated by u=b+1 ---

const uNOT = (a: Trit): Trit => (2 - a) as Trit;
const uMIN = (a: Trit, b: Trit): Trit => Math.min(a, b) as Trit;
const uMAX = (a: Trit, b: Trit): Trit => Math.max(a, b) as Trit;
// (a-1)(b-1)+1 is bXNOR carried across the +1 shift; equality operator on {0,2}.
const uXNOR = (a: Trit, b: Trit): Trit => ((a - 1) * (b - 1) + 1) as Trit;
const uXOR = (a: Trit, b: Trit): Trit => (1 - (a - 1) * (b - 1)) as Trit;
const uSUM = (a: Trit, b: Trit): Trit => ((a + b) % 3) as Trit;
const uCARRY = (a: Trit, b: Trit): Trit => Math.floor((a + b) / 3) as Trit;

export const unbalancedGates: Record<GateName, (a: Trit, b: Trit) => Trit> = {
  NOT: (a) => uNOT(a),
  AND: uMIN,
  OR: uMAX,
  NAND: (a, b) => uNOT(uMIN(a, b)),
  NOR: (a, b) => uNOT(uMAX(a, b)),
  XOR: uXOR,
  XNOR: uXNOR,
  MIN: uMIN,
  MAX: uMAX,
  SUM: uSUM,
  CARRY: uCARRY,
  COMPARE, // ordering is system-independent; returns a balanced trit
};

export const gatesFor = (
  system: System,
): Record<GateName, (a: Trit, b: Trit) => Trit> =>
  system === "balanced" ? balancedGates : unbalancedGates;

/** Enumerate a gate's full truth table: 3 rows (unary) or 9 rows (binary). */
export function truthTableFor(
  system: System,
  name: GateName,
): { inputs: Trit[]; output: Trit }[] {
  const fn = gatesFor(system)[name];
  const vals = tritValues(system);
  const rows: { inputs: Trit[]; output: Trit }[] = [];
  if (GATE_ARITY[name] === 1) {
    for (const a of vals) rows.push({ inputs: [a], output: fn(a, 0) });
  } else {
    for (const a of vals)
      for (const b of vals) rows.push({ inputs: [a, b], output: fn(a, b) });
  }
  return rows;
}
