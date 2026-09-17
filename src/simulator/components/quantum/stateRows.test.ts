import { describe, it, expect } from "vitest";
import { stateRows, filterSort, totalProb, fmtAmp } from "./stateRows.ts";
import { zeroState, applyOperation } from "../../quantum/statevector.ts";

// Bell = (|00⟩ + |11⟩)/√2 via H(0), CX(0,1).
function bell() {
  let s = zeroState(2);
  s = applyOperation(s, { gate: "H", qubits: [0] }, 2);
  s = applyOperation(s, { gate: "CX", qubits: [0, 1] }, 2);
  return s;
}

describe("stateRows", () => {
  it("one row per basis state with correct probs (Bell)", () => {
    const rows = stateRows(bell(), 2);
    expect(rows).toHaveLength(4);
    const byLabel = Object.fromEntries(rows.map((r) => [r.label, r]));
    expect(byLabel["|00⟩"].prob).toBeCloseTo(0.5, 6);
    expect(byLabel["|11⟩"].prob).toBeCloseTo(0.5, 6);
    expect(byLabel["|01⟩"].prob).toBeCloseTo(0, 6);
    expect(byLabel["|10⟩"].prob).toBeCloseTo(0, 6);
  });

  it("totalProb ≈ 1", () => {
    expect(totalProb(stateRows(bell(), 2))).toBeCloseTo(1, 6);
  });

  it("hideZero drops ~0 rows; sortBy prob puts biggest first", () => {
    const rows = stateRows(bell(), 2);
    const shown = filterSort(rows, { hideZero: true, sortBy: "prob" });
    expect(shown).toHaveLength(2);
    expect(shown[0].prob).toBeCloseTo(0.5, 6);
  });

  it("fmtAmp signs the imaginary part", () => {
    expect(fmtAmp(0.707, 0)).toBe("0.707 + 0.000i");
    expect(fmtAmp(0, -1)).toBe("0.000 − 1.000i");
  });
});
