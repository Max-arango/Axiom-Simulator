import { describe, it, expect } from "vitest";
import { makeRng } from "../mathlab/core/rng.ts";
import { runShotsTrajectory } from "./trajectory.ts";
import { NO_NOISE, type NoiseConfig } from "./noise.ts";
import type { Circuit } from "./types.ts";

const sum = (r: Record<string, number>) => Object.values(r).reduce((a, b) => a + b, 0);

// X(0) then measure → ideal result is always "1".
const X_MEAS: Circuit = { qubits: 1, clbits: 1, ops: [{ gate: "X", qubits: [0] }, { gate: "M", qubits: [0], clbit: 0 }] };
const H_MEAS: Circuit = { qubits: 1, clbits: 1, ops: [{ gate: "H", qubits: [0] }, { gate: "M", qubits: [0], clbit: 0 }] };

describe("noise (Monte-Carlo)", () => {
  it("disabled noise reproduces the noiseless histogram", () => {
    const a = runShotsTrajectory(H_MEAS, 800, makeRng(7), NO_NOISE);
    const b = runShotsTrajectory(H_MEAS, 800, makeRng(7));
    expect(a).toEqual(b);
  });

  it("depolarizing=0 (but enabled) equals no-noise for the same seed", () => {
    const cfg: NoiseConfig = { enabled: true, depolarizing: 0, readout: 0 };
    const a = runShotsTrajectory(X_MEAS, 500, makeRng(3), cfg);
    const b = runShotsTrajectory(X_MEAS, 500, makeRng(3), NO_NOISE);
    expect(a).toEqual(b);
  });

  it("readout error = 1 flips every measured bit", () => {
    const cfg: NoiseConfig = { enabled: true, depolarizing: 0, readout: 1 };
    const r = runShotsTrajectory(X_MEAS, 300, makeRng(9), cfg); // ideal "1" → all reported "0"
    expect(r["0"]).toBe(300);
    expect(r["1"]).toBeUndefined();
  });

  it("depolarizing noise introduces errors (some 0s appear after X)", () => {
    const cfg: NoiseConfig = { enabled: true, depolarizing: 0.5, readout: 0 };
    const r = runShotsTrajectory(X_MEAS, 2000, makeRng(11), cfg);
    expect(sum(r)).toBe(2000);
    expect(r["0"] ?? 0).toBeGreaterThan(0); // errors flipped some to 0
    expect(r["1"] ?? 0).toBeGreaterThan(0); // but not all
  });

  it("is deterministic for a fixed seed", () => {
    const cfg: NoiseConfig = { enabled: true, depolarizing: 0.1, readout: 0.05 };
    const a = runShotsTrajectory(H_MEAS, 500, makeRng(21), cfg);
    const b = runShotsTrajectory(H_MEAS, 500, makeRng(21), cfg);
    expect(a).toEqual(b);
  });
});
