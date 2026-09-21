// Q-sphere layout (IBM Composer's signature multi-amplitude view). PURE: no
// React, no GL. Places every 2^n computational basis state as a node on a unit
// sphere, latitude by Hamming weight (number of 1 bits), longitude spread evenly
// within each weight ring. Node magnitude = |amplitude|, phase = arg(amplitude).
//
// Little-endian, same as the rest of the engine: qubit i = bit i of the index.
// Weight only counts bits, so endianness is irrelevant to the latitude.

import { abs, arg } from "../mathlab/complex/complex.ts";
import type { StateVector } from "./types.ts";

export interface QNode {
  index: number;
  x: number;
  y: number;
  z: number;
  prob: number; // |amp|²
  phase: number; // arg(amp) ∈ (−π, π]
  weight: number; // popcount(index)
}

/** Number of set bits in a non-negative integer. */
function popcount(i: number): number {
  let c = 0;
  for (let b = i; b > 0; b >>= 1) c += b & 1;
  return c;
}

/**
 * One node per basis index. Latitude by Hamming weight w: w=0 at the north pole
 * (z=+1), w=n at the south pole (z=−1); intermediate z = 1 − 2·(w/n). Longitude:
 * within a weight class of size m, angle_k = 2π·k/m (k = position in the class,
 * ordered by ascending basis index). Ring radius = √(1 − z²).
 */
export function qsphereNodes(state: StateVector, n: number): QNode[] {
  if (!Number.isInteger(n) || n < 1 || n > 6) {
    throw new Error(`qsphereNodes: n must be an integer in [1,6], got ${n}`);
  }
  const dim = 1 << n;
  // Group indices by weight so we know each class size m and the running k.
  const byWeight: number[][] = Array.from({ length: n + 1 }, () => []);
  for (let i = 0; i < dim; i++) byWeight[popcount(i)].push(i);

  const nodes: QNode[] = new Array(dim);
  for (let w = 0; w <= n; w++) {
    const ring = byWeight[w];
    const m = ring.length;
    const z = 1 - 2 * (w / n);
    const ringR = Math.sqrt(Math.max(0, 1 - z * z));
    for (let k = 0; k < m; k++) {
      const index = ring[k];
      const angle = m > 0 ? (2 * Math.PI * k) / m : 0;
      const amp = state[index] ?? { re: 0, im: 0 };
      const mag = abs(amp);
      nodes[index] = {
        index,
        x: ringR * Math.cos(angle),
        y: ringR * Math.sin(angle),
        z,
        prob: mag * mag,
        phase: arg(amp),
        weight: w,
      };
    }
  }
  return nodes;
}

/**
 * Map a phase ∈ (−π, π] to an RGB in [0,1] via an HSV hue wheel with S=V=1:
 * hue = (phase+π)/(2π)·360°. −π and π both land on the same (wrapped) hue.
 */
export function phaseColor(phase: number): [number, number, number] {
  const hue = ((phase + Math.PI) / (2 * Math.PI)) * 360; // [0, 360]
  const h = hue / 60; // [0, 6]
  const x = 1 - Math.abs((h % 2) - 1); // chroma edge (C = 1 since S=V=1)
  let r = 0, g = 0, b = 0;
  if (h < 1) { r = 1; g = x; }
  else if (h < 2) { r = x; g = 1; }
  else if (h < 3) { g = 1; b = x; }
  else if (h < 4) { g = x; b = 1; }
  else if (h < 5) { r = x; b = 1; }
  else { r = 1; b = x; }
  return [r, g, b];
}
