// Zustand state store + circuit-grid model for the Quantum Lab UI. PURE logic:
// no React, no JSX. This is the contract every UI panel reads.
//
// GRID MODEL: the circuit is a flat PlacedOp[]. The visual grid is
// rows = qubits × cols = columns (moments). Within ONE column every placement
// acts on DISJOINT qubits. A "step" k means "after executing columns 0..k-1":
// step 0 = |0…0⟩, step = columnCount = full circuit.
//
// MULTI-QUBIT PICK ORDER (fixed here, honoured by the engine — see types.ts):
// qubits = [...controls, target] — the LAST qubit picked is the target. So for a
// staged CX, first click = control, second click = target.
//
// Little-endian qubit↔bit mapping throughout (qubit i = bit i). Ids are
// deterministic via a monotonic `nextId` counter — NO Date.now()/Math.random().
// noUncheckedIndexedAccess is OFF here, so array indices are guarded by hand.

import { create } from "zustand";
import { makeRng } from "../mathlab/core/rng.ts";
import { GATES } from "./gates.ts";
import { applyOperation, zeroState } from "./statevector.ts";
import { runCircuit } from "./simulator.ts";
import { sampleShots } from "./measurement.ts";
import { validate } from "./circuit.ts";
import {
  MAX_QUBITS,
  type Circuit,
  type GateId,
  type GateParams,
  type Operation,
  type StateVector,
} from "./types.ts";

/** One gate placed on the grid: an Operation plus its id and visual column. */
export interface PlacedOp {
  id: string;
  gate: GateId;
  qubits: number[];
  params?: GateParams;
  column: number;
}

/** A multi-qubit placement in progress (qubits collected across clicks). */
export interface Pending {
  gate: GateId;
  column: number;
  qubits: number[];
}

export interface QuantumState {
  numQubits: number;
  placements: PlacedOp[];
  nextId: number;
  selectedGate: GateId | null;
  draftParams: GateParams;
  pending: Pending | null;
  selectedId: string | null;
  step: number;
  playing: boolean;
  selectedQubit: number;
  shots: number;
  seed: number;
  shotResults: Record<string, number> | null;
  error: string | null;

  setNumQubits: (n: number) => void;
  selectGate: (id: GateId | null) => void;
  setDraftParam: (key: "theta" | "phi", value: number) => void;
  cellClick: (qubit: number, column: number) => void;
  cancelPending: () => void;
  selectPlacement: (id: string | null) => void;
  updatePlacementParams: (id: string, params: GateParams) => void;
  removePlacement: (id: string) => void;
  clearCircuit: () => void;
  loadCircuit: (circuit: Circuit) => void;
  reset: () => void;
  setStep: (n: number) => void;
  stepForward: () => void;
  stepBack: () => void;
  gotoStart: () => void;
  gotoEnd: () => void;
  play: () => void;
  pause: () => void;
  setSelectedQubit: (q: number) => void;
  setShots: (n: number) => void;
  runShots: () => void;
  setSeed: (n: number) => void;
}

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

/** Fresh default data fields (excludes actions). Exported so tests can reset. */
export function makeInitialState(): Pick<
  QuantumState,
  | "numQubits" | "placements" | "nextId" | "selectedGate" | "draftParams"
  | "pending" | "selectedId" | "step" | "playing" | "selectedQubit"
  | "shots" | "seed" | "shotResults" | "error"
> {
  return {
    numQubits: 3,
    placements: [],
    nextId: 1,
    selectedGate: "H",
    draftParams: { theta: Math.PI / 2, phi: Math.PI / 2 },
    pending: null,
    selectedId: null,
    step: 0,
    playing: false,
    selectedQubit: 0,
    shots: 1024,
    seed: 12345,
    shotResults: null,
    error: null,
  };
}

/** Only the params a gate actually declares, pulled from the draft; undefined if none. */
function paramsFor(gate: GateId, draft: GateParams): GateParams | undefined {
  const spec = GATES[gate];
  if (spec.params.length === 0) return undefined;
  const p: GateParams = {};
  for (const key of spec.params) p[key] = draft[key];
  return p;
}

export const useQuantum = create<QuantumState>((set, get) => ({
  ...makeInitialState(),

  setNumQubits: (n) =>
    set((s) => {
      const num = clamp(Math.floor(n), 1, MAX_QUBITS);
      const placements = s.placements.filter((p) => p.qubits.every((q) => q < num));
      const pending = s.pending && s.pending.qubits.every((q) => q < num) ? s.pending : null;
      return { numQubits: num, placements, pending, selectedQubit: clamp(s.selectedQubit, 0, num - 1), step: 0 };
    }),

  selectGate: (id) => set({ selectedGate: id, pending: null }),

  setDraftParam: (key, value) => set((s) => ({ draftParams: { ...s.draftParams, [key]: value } })),

  cellClick: (qubit, column) => {
    const s = get();
    const gate = s.selectedGate;
    if (gate === null) return; // no palette selection → no-op
    if (!Number.isInteger(qubit) || qubit < 0 || qubit >= s.numQubits || column < 0) return;
    const spec = GATES[gate];

    // single-qubit / measure: place immediately if the cell is free
    if (spec.arity === 1) {
      if (placementAt(s.placements, qubit, column)) {
        set({ error: "That cell is already occupied." });
        return;
      }
      const params = paramsFor(gate, s.draftParams);
      const placement: PlacedOp = { id: `op-${s.nextId}`, gate, qubits: [qubit], column };
      if (params) placement.params = params;
      set({ placements: [...s.placements, placement], nextId: s.nextId + 1, error: null });
      return;
    }

    // multi-qubit (controlled/swap): staged across clicks within ONE column
    if (placementAt(s.placements, qubit, column)) {
      set({ error: "That cell is already occupied." });
      return;
    }
    const pending = s.pending;
    const staged = pending !== null && pending.gate === gate && pending.column === column;
    if (!staged) {
      // no matching stage (fresh, gate changed, or different column) → start over here
      set({ pending: { gate, column, qubits: [qubit] }, error: null });
      return;
    }
    if (pending.qubits.includes(qubit)) {
      set({ error: "Place each qubit of a multi-qubit gate once, within one column." });
      return;
    }
    const qubits = [...pending.qubits, qubit];
    if (qubits.length === spec.arity) {
      const params = paramsFor(gate, s.draftParams);
      const placement: PlacedOp = { id: `op-${s.nextId}`, gate, qubits, column };
      if (params) placement.params = params;
      set({ placements: [...s.placements, placement], nextId: s.nextId + 1, pending: null, error: null });
    } else {
      set({ pending: { gate, column, qubits }, error: null });
    }
  },

  cancelPending: () => set({ pending: null }),

  selectPlacement: (id) => set({ selectedId: id }),

  updatePlacementParams: (id, params) =>
    set((s) => ({
      placements: s.placements.map((p) => (p.id === id ? { ...p, params: { ...p.params, ...params } } : p)),
    })),

  removePlacement: (id) =>
    set((s) => ({
      placements: s.placements.filter((p) => p.id !== id),
      selectedId: s.selectedId === id ? null : s.selectedId,
    })),

  clearCircuit: () => set({ placements: [], pending: null, selectedId: null, step: 0, shotResults: null }),

  loadCircuit: (circuit) =>
    set((s) => {
      const num = clamp(Math.floor(circuit.qubits), 1, MAX_QUBITS);
      const lastUsed = new Array(num).fill(-1); // last column each qubit was used
      const placements: PlacedOp[] = [];
      let id = s.nextId;
      for (const op of circuit.ops) {
        let col = 0; // ASAP: 1 + max last-used column among this op's qubits
        for (const q of op.qubits) {
          if (q >= 0 && q < num && lastUsed[q] + 1 > col) col = lastUsed[q] + 1;
        }
        for (const q of op.qubits) if (q >= 0 && q < num) lastUsed[q] = col;
        const placement: PlacedOp = { id: `op-${id}`, gate: op.gate, qubits: [...op.qubits], column: col };
        if (op.params) placement.params = { ...op.params };
        placements.push(placement);
        id++;
      }
      return {
        numQubits: num,
        placements,
        nextId: id,
        step: 0,
        pending: null,
        selectedId: null,
        shotResults: null,
        error: null,
        selectedQubit: clamp(s.selectedQubit, 0, num - 1),
      };
    }),

  reset: () => set((s) => ({ ...makeInitialState(), numQubits: s.numQubits })),

  setStep: (n) => set((s) => ({ step: clamp(Math.floor(n), 0, columnCount(s.placements)) })),
  stepForward: () => set((s) => ({ step: clamp(s.step + 1, 0, columnCount(s.placements)) })),
  stepBack: () => set((s) => ({ step: clamp(s.step - 1, 0, columnCount(s.placements)) })),
  gotoStart: () => set({ step: 0 }),
  gotoEnd: () => set((s) => ({ step: columnCount(s.placements) })),

  play: () => set({ playing: true }),
  pause: () => set({ playing: false }),

  setSelectedQubit: (q) => set((s) => ({ selectedQubit: clamp(Math.floor(q), 0, s.numQubits - 1) })),

  setShots: (n) => set({ shots: Math.max(1, Math.floor(n)) }),

  runShots: () =>
    set((s) => {
      const state = runCircuit(toCircuit(s));
      return { shotResults: sampleShots(state, s.numQubits, s.shots, makeRng(s.seed)) };
    }),

  setSeed: (n) => set({ seed: n }),
}));

// --- exported pure selectors/helpers (plain functions, NOT hooks) ---

/** Sort placements by column (stable) and strip id/column → engine Circuit. */
export function toCircuit(s: { numQubits: number; placements: PlacedOp[] }): Circuit {
  const sorted = [...s.placements].sort((a, b) => a.column - b.column);
  const ops: Operation[] = sorted.map((p) => {
    const op: Operation = { gate: p.gate, qubits: [...p.qubits] };
    if (p.params) op.params = { ...p.params };
    return op;
  });
  return { qubits: s.numQubits, ops };
}

/** Number of grid columns = max column + 1 (0 if empty). */
export function columnCount(placements: PlacedOp[]): number {
  let max = -1;
  for (const p of placements) if (p.column > max) max = p.column;
  return max + 1;
}

/** State after executing columns 0..col-1 (col=0 → zeroState). Raw unitary fold. */
export function stateAfterColumn(numQubits: number, placements: PlacedOp[], col: number): StateVector {
  let state = zeroState(numQubits);
  const ops = placements.filter((p) => p.column < col).sort((a, b) => a.column - b.column);
  for (const p of ops) {
    const op: Operation = { gate: p.gate, qubits: p.qubits };
    if (p.params) op.params = p.params;
    state = applyOperation(state, op, numQubits);
  }
  return state;
}

/** State at the store's current step. */
export function currentState(s: { numQubits: number; placements: PlacedOp[]; step: number }): StateVector {
  return stateAfterColumn(s.numQubits, s.placements, s.step);
}

/** The placement covering (qubit, column), if any. */
export function placementAt(placements: PlacedOp[], qubit: number, column: number): PlacedOp | undefined {
  return placements.find((p) => p.column === column && p.qubits.includes(qubit));
}

/** Structural validation of the current grid via the engine's validate(). */
export function validateCircuit(s: { numQubits: number; placements: PlacedOp[] }): { ok: boolean; errors: string[] } {
  return validate(toCircuit(s));
}
