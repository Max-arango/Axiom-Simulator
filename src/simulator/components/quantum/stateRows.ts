// Pure derivation of displayable statevector rows. No React.
// One row per computational-basis index; label is the MSB-left bitstring ket.
import { type StateVector } from "../../quantum/types.ts";
import { bitstring } from "../../quantum/measurement.ts";
import { abs, arg } from "../../mathlab/complex/complex.ts";

export interface StateRow {
  index: number;
  label: string; // "|010⟩"
  re: number;
  im: number;
  mag: number;
  phase: number; // radians
  prob: number;
}

export function stateRows(state: StateVector, n: number): StateRow[] {
  const rows: StateRow[] = [];
  for (let i = 0; i < state.length; i++) {
    const amp = state[i] ?? { re: 0, im: 0 };
    const mag = abs(amp);
    rows.push({
      index: i,
      label: `|${bitstring(i, n)}⟩`,
      re: amp.re,
      im: amp.im,
      mag,
      phase: arg(amp),
      prob: mag * mag,
    });
  }
  return rows;
}

export function filterSort(
  rows: StateRow[],
  opts: { hideZero: boolean; sortBy: "index" | "prob"; threshold?: number },
): StateRow[] {
  const thr = opts.threshold ?? 1e-9;
  let out = opts.hideZero ? rows.filter((r) => r.prob >= thr) : rows.slice();
  if (opts.sortBy === "prob") out.sort((a, b) => b.prob - a.prob || a.index - b.index);
  return out;
}

export function totalProb(rows: StateRow[]): number {
  return rows.reduce((s, r) => s + r.prob, 0);
}

// "a + bi" with fixed precision and correct sign on the imaginary part.
export function fmtAmp(re: number, im: number, dp = 3): string {
  const r = re.toFixed(dp);
  const iAbs = Math.abs(im).toFixed(dp);
  const sign = im < 0 ? "−" : "+";
  return `${r} ${sign} ${iAbs}i`;
}
