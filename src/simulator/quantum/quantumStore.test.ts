import { beforeEach, describe, it, expect } from "vitest";
import type { Circuit } from "./types.ts";
import { probabilities } from "./statevector.ts";
import {
  useQuantum,
  makeInitialState,
  toCircuit,
  columnCount,
  stateAfterColumn,
  currentState,
  placementAt,
} from "./quantumStore.ts";

const R2 = Math.SQRT1_2;

// Bell: H(0)·CX(0→1) → (|00⟩+|11⟩)/√2 at little-endian indices 0 and 3.
const BELL: Circuit = { qubits: 2, ops: [{ gate: "H", qubits: [0] }, { gate: "CX", qubits: [0, 1] }] };

// Reset the store to a clean default before every test (keeps the actions).
beforeEach(() => useQuantum.setState(makeInitialState()));

const s = () => useQuantum.getState();

describe("setNumQubits", () => {
  it("clamps to 1..MAX_QUBITS and drops placements referencing a dropped qubit", () => {
    s().setNumQubits(3);
    s().selectGate("X");
    s().cellClick(2, 0); // place X on qubit 2
    expect(s().placements.length).toBe(1);
    s().setNumQubits(2); // qubit 2 no longer exists
    expect(s().placements.length).toBe(0);
    expect(s().numQubits).toBe(2);
    expect(s().step).toBe(0);
  });
});

describe("cellClick — single gate", () => {
  it("places a single gate; clicking the same cell again errors with no duplicate", () => {
    s().selectGate("H");
    s().cellClick(0, 0);
    expect(s().placements.length).toBe(1);
    expect(s().placements[0].gate).toBe("H");
    expect(s().placements[0].qubits).toEqual([0]);
    expect(s().placements[0].column).toBe(0);
    expect(s().error).toBeNull();

    s().cellClick(0, 0); // occupied
    expect(s().placements.length).toBe(1);
    expect(s().error).not.toBeNull();
  });

  it("no-op when no gate is selected", () => {
    s().selectGate(null);
    s().cellClick(0, 0);
    expect(s().placements.length).toBe(0);
  });
});

describe("cellClick — staged multi-qubit CX", () => {
  it("first click stages pending, second click in the same column commits [control,target]", () => {
    s().selectGate("CX");
    s().cellClick(0, 0);
    expect(s().pending).toEqual({ gate: "CX", column: 0, qubits: [0] });
    expect(s().placements.length).toBe(0);

    s().cellClick(1, 0);
    expect(s().pending).toBeNull();
    expect(s().placements.length).toBe(1);
    expect(s().placements[0].qubits).toEqual([0, 1]); // control 0, target 1 (last pick)
    expect(s().placements[0].column).toBe(0);
  });
});

describe("removePlacement", () => {
  it("drops the placement and clears selection if it was selected", () => {
    s().selectGate("H");
    s().cellClick(0, 0);
    const id = s().placements[0].id;
    s().selectPlacement(id);
    s().removePlacement(id);
    expect(s().placements.length).toBe(0);
    expect(s().selectedId).toBeNull();
  });
});

describe("loadCircuit", () => {
  it("schedules Bell greedily: H at column 0, CX at column 1; columnCount === 2", () => {
    s().loadCircuit(BELL);
    expect(s().numQubits).toBe(2);
    const byGate = Object.fromEntries(s().placements.map((p) => [p.gate, p.column]));
    expect(byGate).toEqual({ H: 0, CX: 1 });
    expect(columnCount(s().placements)).toBe(2);
  });
});

describe("toCircuit", () => {
  it("round-trips ordering by column", () => {
    s().loadCircuit(BELL);
    const c = toCircuit(s());
    expect(c.qubits).toBe(2);
    expect(c.ops.map((o) => o.gate)).toEqual(["H", "CX"]);
    expect(c.ops[1].qubits).toEqual([0, 1]);
  });
});

describe("stateAfterColumn / currentState", () => {
  it("step at columnCount → full Bell state (0.5 prob at indices 0 and 3)", () => {
    s().loadCircuit(BELL);
    s().setStep(columnCount(s().placements));
    const p = probabilities(currentState(s()));
    expect(p[0]).toBeCloseTo(0.5, 6);
    expect(p[3]).toBeCloseTo(0.5, 6);
    expect(p[1]).toBeCloseTo(0, 6);
    expect(p[2]).toBeCloseTo(0, 6);
  });

  it("step 1 (after H only) → q0 in superposition amp[0]=amp[1]≈1/√2", () => {
    s().loadCircuit(BELL);
    const st = stateAfterColumn(2, s().placements, 1);
    expect(st[0].re).toBeCloseTo(R2, 6);
    expect(st[1].re).toBeCloseTo(R2, 6);
  });

  it("step 0 is the zero state", () => {
    s().loadCircuit(BELL);
    const st = stateAfterColumn(2, s().placements, 0);
    expect(st[0].re).toBeCloseTo(1, 6);
    expect(st[1].re).toBeCloseTo(0, 6);
  });
});

describe("placementAt", () => {
  it("finds a placement covering a qubit within a column", () => {
    s().loadCircuit(BELL);
    const cx = placementAt(s().placements, 1, 1); // CX target qubit 1, column 1
    expect(cx?.gate).toBe("CX");
    expect(placementAt(s().placements, 1, 0)).toBeUndefined();
  });
});

describe("runShots", () => {
  it("Bell (seeded) → only 00/11 outcomes, counts sum to shots, deterministic", () => {
    s().loadCircuit(BELL);
    s().setShots(512);
    s().runShots();
    const a = s().shotResults!;
    expect(Object.keys(a).sort()).toEqual(["00", "11"]);
    expect(Object.values(a).reduce((x, y) => x + y, 0)).toBe(512);

    // same seed twice → identical histogram
    useQuantum.setState(makeInitialState());
    s().loadCircuit(BELL);
    s().setShots(512);
    s().runShots();
    expect(s().shotResults).toEqual(a);
  });
});

describe("deterministic ids", () => {
  it("loading the same circuit twice after reset yields the same id sequence", () => {
    s().loadCircuit(BELL);
    const first = s().placements.map((p) => p.id);
    expect(first).toEqual(["op-1", "op-2"]);

    useQuantum.setState(makeInitialState()); // resets nextId to 1
    s().loadCircuit(BELL);
    expect(s().placements.map((p) => p.id)).toEqual(first);
  });
});

describe("movePlacement (drag a gate)", () => {
  const st = () => useQuantum.getState();

  it("relocates a single-qubit gate to a new qubit + column", () => {
    st().setNumQubits(3);
    st().selectGate("H");
    st().cellClick(0, 0);
    const id = st().placements[0].id;
    st().movePlacement(id, 0, 1, 2); // drag q0 → q1, column 2
    const p = st().placements[0];
    expect(p.qubits).toEqual([1]);
    expect(p.column).toBe(2);
    expect(st().error).toBeNull();
  });

  it("shifts a multi-qubit gate uniformly (control+target keep their offset)", () => {
    st().setNumQubits(4);
    st().selectGate("CX");
    st().cellClick(0, 0); // control
    st().cellClick(1, 0); // target → CX [0,1]@0
    const id = st().placements[0].id;
    st().movePlacement(id, 0, 2, 0); // drag its q0 down to q2
    expect(st().placements[0].qubits).toEqual([2, 3]);
    expect(st().placements[0].column).toBe(0);
  });

  it("rejects a move that collides with another gate", () => {
    st().setNumQubits(2);
    st().selectGate("H");
    st().cellClick(0, 0); // H @ q0,c0
    st().selectGate("X");
    st().cellClick(1, 0); // X @ q1,c0
    const xId = st().placements[1].id;
    st().movePlacement(xId, 1, 0, 0); // drop X onto H's cell
    expect(st().error).toMatch(/otra puerta/);
    expect(st().placements[1].qubits).toEqual([1]); // unchanged
  });

  it("rejects a move that would leave the qubit range", () => {
    st().setNumQubits(2);
    st().selectGate("CX");
    st().cellClick(0, 0);
    st().cellClick(1, 0); // CX [0,1]@0
    const id = st().placements[0].id;
    st().movePlacement(id, 0, 1, 0); // dq=+1 → qubits [1,2], 2 is out of range
    expect(st().error).toMatch(/rango/);
    expect(st().placements[0].qubits).toEqual([0, 1]); // unchanged
  });
});
