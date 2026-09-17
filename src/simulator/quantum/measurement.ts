// Measurement & sampling over the statevector. Little-endian storage (qubit i =
// bit i of the basis index, value = (index >> i) & 1) — same as the rest of the
// engine. All sampling takes a passed-in seeded Rng so results are reproducible.
//
// DISPLAY BITSTRING FORMAT (fixed once here): bitstring(index, n) writes qubit
// n-1 first ... qubit 0 last — MSB-left, the conventional way a register reads.
// e.g. n=2, index 2 = |q1=1,q0=0⟩ → "10". This is the KEY used by sampleShots
// and the `bitstring` field of measureAll. (Note: `bits[]` below is the opposite
// order — little-endian, bits[i] = qubit i — because callers index it by qubit.)

import { C } from "../mathlab/complex/complex.ts";
import type { Rng } from "../mathlab/core/rng.ts";
import { normalize, probabilities } from "./statevector.ts";
import { MAX_QUBITS, type StateVector } from "./types.ts";

function assertN(n: number): void {
  if (!Number.isInteger(n) || n < 1) throw new Error(`qubit count must be a positive integer, got ${n}`);
  if (n > MAX_QUBITS) throw new Error(`qubit count ${n} exceeds MAX_QUBITS=${MAX_QUBITS}`);
}

function assertQubit(q: number, n: number): void {
  if (!Number.isInteger(q) || q < 0 || q >= n) throw new Error(`qubit ${q} out of range [0,${n})`);
}

/** Display string: qubit n-1 first ... qubit 0 last (MSB-left). */
export function bitstring(index: number, n: number): string {
  assertN(n);
  let s = "";
  for (let q = n - 1; q >= 0; q--) s += (index >> q) & 1;
  return s;
}

/** Draw one basis index from a probability distribution by cumulative sum. */
function sampleIndex(probs: number[], rng: Rng): number {
  const r = rng.next();
  let acc = 0;
  for (let i = 0; i < probs.length; i++) {
    acc += probs[i];
    if (r < acc) return i;
  }
  return probs.length - 1; // rounding fallback: r fell past the last edge
}

/** P(qubit == value) = Σ |amp|² over basis states whose `qubit` bit equals value. */
export function probabilityOfOutcome(state: StateVector, qubit: number, value: 0 | 1, n: number): number {
  assertN(n);
  assertQubit(qubit, n);
  const probs = probabilities(state);
  let p = 0;
  for (let i = 0; i < probs.length; i++) {
    if (((i >> qubit) & 1) === value) p += probs[i];
  }
  return p;
}

/**
 * Projectively measure one qubit: draw against P(0), collapse (zero the
 * amplitudes inconsistent with the outcome), renormalize.
 */
export function measureQubit(
  state: StateVector, qubit: number, n: number, rng: Rng,
): { outcome: 0 | 1; state: StateVector } {
  assertN(n);
  assertQubit(qubit, n);
  const p0 = probabilityOfOutcome(state, qubit, 0, n);
  const outcome: 0 | 1 = rng.next() < p0 ? 0 : 1;
  const collapsed = state.map((z, i) => (((i >> qubit) & 1) === outcome ? z : C(0)));
  return { outcome, state: normalize(collapsed) };
}

/**
 * Sample ONE full-register outcome from |amp|². Returns the basis index, the
 * per-qubit bits (little-endian: bits[i] = qubit i) and the display bitstring.
 */
export function measureAll(
  state: StateVector, n: number, rng: Rng,
): { index: number; bits: number[]; bitstring: string } {
  assertN(n);
  const index = sampleIndex(probabilities(state), rng);
  const bits: number[] = [];
  for (let q = 0; q < n; q++) bits.push((index >> q) & 1);
  return { index, bits, bitstring: bitstring(index, n) };
}

/**
 * Histogram of `shots` full-register samples (NO collapse between shots — each
 * shot is an independent draw from the same distribution). Key = display
 * bitstring, value = count. One passed-in rng ⇒ deterministic.
 */
export function sampleShots(
  state: StateVector, n: number, shots: number, rng: Rng,
): Record<string, number> {
  assertN(n);
  if (!Number.isInteger(shots) || shots < 0) throw new Error(`shots must be a non-negative integer, got ${shots}`);
  const probs = probabilities(state);
  const counts: Record<string, number> = {};
  for (let s = 0; s < shots; s++) {
    const key = bitstring(sampleIndex(probs, rng), n);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}
