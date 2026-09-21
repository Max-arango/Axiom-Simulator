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
import { runTrajectory, runShotsTrajectory, isStochastic } from "./trajectory.ts";
import { validate } from "./circuit.ts";
import { BUILTIN_COMPOSITES, expandComposite, type CompositeDef } from "./composites.ts";
import { NO_NOISE, type NoiseConfig } from "./noise.ts";
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
  openControls?: number[]; // control qubit indices that fire on |0⟩ (anti-controls)
  clbit?: number; // for M: classical bit to write (defaults to the measured qubit)
  condition?: { clbit: number; value: 0 | 1 }; // c_if: apply only if clbit === value
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
  past: HistorySnapshot[];
  future: HistorySnapshot[];
  composites: CompositeDef[];
  noise: NoiseConfig;

  setNumQubits: (n: number) => void;
  selectGate: (id: GateId | null) => void;
  setDraftParam: (key: "theta" | "phi" | "lambda", value: number) => void;
  cellClick: (qubit: number, column: number) => void;
  cancelPending: () => void;
  selectPlacement: (id: string | null) => void;
  updatePlacementParams: (id: string, params: GateParams) => void;
  removePlacement: (id: string) => void;
  /** Drag a placed gate: shift it so its `fromQubit` lands on (`toQubit`,`toColumn`). */
  movePlacement: (id: string, fromQubit: number, toQubit: number, toColumn: number) => void;
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
  undo: () => void;
  redo: () => void;
  setOpenControls: (id: string, openControls: number[]) => void;
  /** Set (or clear with null) a classical conditional (c_if) on a placed gate. */
  setCondition: (id: string, condition: { clbit: number; value: 0 | 1 } | null) => void;
  /** Set the classical-bit target of a measurement op. */
  setClbit: (id: string, clbit: number) => void;
  /** Save the current circuit as a reusable composite gate. */
  saveComposite: (name: string) => void;
  /** Stamp a composite's expanded ops onto the circuit starting at `baseQubit`. */
  insertComposite: (id: string, baseQubit: number) => void;
  deleteComposite: (id: string) => void;
  /** Update the Monte-Carlo noise model (applied only to shots). */
  setNoise: (patch: Partial<NoiseConfig>) => void;
}

/** Undo/redo entry: only the circuit-defining fields we restore. */
export type HistorySnapshot = Pick<QuantumState, "numQubits" | "placements" | "nextId">;

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

const snap = (s: QuantumState): HistorySnapshot => ({
  numQubits: s.numQubits,
  placements: s.placements,
  nextId: s.nextId,
});

/** Patch that records the current circuit into `past` (cap 100) and clears redo. */
const pushHistory = (s: QuantumState): Pick<QuantumState, "past" | "future"> => ({
  past: [...s.past.slice(-99), snap(s)],
  future: [],
});

/** Fresh default data fields (excludes actions). Exported so tests can reset. */
export function makeInitialState(): Pick<
  QuantumState,
  | "numQubits" | "placements" | "nextId" | "selectedGate" | "draftParams"
  | "pending" | "selectedId" | "step" | "playing" | "selectedQubit"
  | "shots" | "seed" | "shotResults" | "error" | "past" | "future"
> {
  return {
    numQubits: 3,
    placements: [],
    nextId: 1,
    selectedGate: "H",
    draftParams: { theta: Math.PI / 2, phi: Math.PI / 2, lambda: Math.PI / 2 },
    pending: null,
    selectedId: null,
    step: 0,
    playing: false,
    selectedQubit: 0,
    shots: 1024,
    seed: 12345,
    shotResults: null,
    error: null,
    past: [],
    future: [],
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
  composites: BUILTIN_COMPOSITES, // library persists across reset() (not in makeInitialState)
  noise: NO_NOISE, // noise setting persists across reset()

  setNumQubits: (n) =>
    set((s) => {
      const num = clamp(Math.floor(n), 1, MAX_QUBITS);
      const placements = s.placements.filter((p) => p.qubits.every((q) => q < num));
      const pending = s.pending && s.pending.qubits.every((q) => q < num) ? s.pending : null;
      return { ...pushHistory(s), numQubits: num, placements, pending, selectedQubit: clamp(s.selectedQubit, 0, num - 1), step: 0 };
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
      set({ ...pushHistory(s), placements: [...s.placements, placement], nextId: s.nextId + 1, error: null });
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
      set({ ...pushHistory(s), placements: [...s.placements, placement], nextId: s.nextId + 1, pending: null, error: null });
    } else {
      set({ pending: { gate, column, qubits }, error: null });
    }
  },

  cancelPending: () => set({ pending: null }),

  selectPlacement: (id) => set({ selectedId: id }),

  updatePlacementParams: (id, params) =>
    set((s) => {
      if (!s.placements.some((p) => p.id === id)) return {};
      return {
        ...pushHistory(s),
        placements: s.placements.map((p) => (p.id === id ? { ...p, params: { ...p.params, ...params } } : p)),
      };
    }),

  removePlacement: (id) =>
    set((s) => {
      if (!s.placements.some((p) => p.id === id)) return {};
      return {
        ...pushHistory(s),
        placements: s.placements.filter((p) => p.id !== id),
        selectedId: s.selectedId === id ? null : s.selectedId,
      };
    }),

  movePlacement: (id, fromQubit, toQubit, toColumn) =>
    set((s) => {
      const p = s.placements.find((x) => x.id === id);
      if (!p) return {};
      const col = Math.max(0, Math.floor(toColumn));
      const dq = Math.floor(toQubit) - Math.floor(fromQubit);
      const dcol = col - p.column;
      if (dq === 0 && dcol === 0) return {}; // dropped on itself → no change
      const newQubits = p.qubits.map((q) => q + dq);
      if (newQubits.some((q) => q < 0 || q >= s.numQubits)) {
        return { error: "No cabe ahí: la puerta se saldría del rango de qubits." };
      }
      // any other placement occupying a target cell → collision
      const clash = s.placements.some(
        (o) => o.id !== id && o.column === col && o.qubits.some((q) => newQubits.includes(q)),
      );
      if (clash) return { error: "No cabe ahí: hay otra puerta en esa posición." };
      return {
        ...pushHistory(s),
        placements: s.placements.map((x) => (x.id === id ? { ...x, qubits: newQubits, column: col } : x)),
        error: null,
      };
    }),

  clearCircuit: () =>
    set((s) => ({ ...pushHistory(s), placements: [], pending: null, selectedId: null, step: 0, shotResults: null })),

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
        if (op.openControls && op.openControls.length) placement.openControls = [...op.openControls];
        placements.push(placement);
        id++;
      }
      return {
        ...pushHistory(s),
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
      const circuit = toCircuit(s);
      // Trajectory path when there's mid-circuit measurement / feed-forward OR noise
      // is enabled; otherwise the fast exact end-measurement of the ideal state.
      if (isStochastic(circuit.ops) || s.noise.enabled) {
        return { shotResults: runShotsTrajectory(circuit, s.shots, makeRng(s.seed), s.noise) };
      }
      const state = runCircuit(circuit);
      return { shotResults: sampleShots(state, s.numQubits, s.shots, makeRng(s.seed)) };
    }),

  setSeed: (n) => set({ seed: n }),

  setNoise: (patch) => set((s) => ({ noise: { ...s.noise, ...patch } })),

  undo: () =>
    set((s) => {
      if (s.past.length === 0) return {};
      const prev = s.past[s.past.length - 1];
      const selectedId = prev.placements.some((p) => p.id === s.selectedId) ? s.selectedId : null;
      return {
        numQubits: prev.numQubits,
        placements: prev.placements,
        nextId: prev.nextId,
        past: s.past.slice(0, -1),
        future: [snap(s), ...s.future],
        step: clamp(s.step, 0, columnCount(prev.placements)),
        pending: null,
        error: null,
        selectedId,
      };
    }),

  redo: () =>
    set((s) => {
      if (s.future.length === 0) return {};
      const next = s.future[0];
      const selectedId = next.placements.some((p) => p.id === s.selectedId) ? s.selectedId : null;
      return {
        numQubits: next.numQubits,
        placements: next.placements,
        nextId: next.nextId,
        past: [...s.past.slice(-99), snap(s)],
        future: s.future.slice(1),
        step: clamp(s.step, 0, columnCount(next.placements)),
        pending: null,
        error: null,
        selectedId,
      };
    }),

  setOpenControls: (id, openControls) =>
    set((s) => {
      const p = s.placements.find((x) => x.id === id);
      if (!p) return {};
      // Anti-controls only make sense on control qubits; targets are excluded.
      const controls = GATES[p.gate].kind === "controlled" ? p.qubits.slice(0, -1) : [];
      const filtered = [...new Set(openControls)].filter((q) => controls.includes(q));
      return {
        ...pushHistory(s),
        placements: s.placements.map((x) => (x.id === id ? { ...x, openControls: filtered } : x)),
      };
    }),

  setCondition: (id, condition) =>
    set((s) => {
      const p = s.placements.find((x) => x.id === id);
      if (!p) return {};
      const cond =
        condition && Number.isInteger(condition.clbit) && condition.clbit >= 0 && condition.clbit < s.numQubits
          ? { clbit: condition.clbit, value: condition.value }
          : undefined;
      return {
        ...pushHistory(s),
        placements: s.placements.map((x) => (x.id === id ? { ...x, condition: cond } : x)),
      };
    }),

  setClbit: (id, clbit) =>
    set((s) => {
      const p = s.placements.find((x) => x.id === id);
      if (!p || !Number.isInteger(clbit) || clbit < 0 || clbit >= s.numQubits) return {};
      return {
        ...pushHistory(s),
        placements: s.placements.map((x) => (x.id === id ? { ...x, clbit } : x)),
      };
    }),

  saveComposite: (name) =>
    set((s) => {
      const trimmed = name.trim();
      if (!trimmed || s.placements.length === 0) {
        return { error: "Nombra la compuerta y ten un circuito no vacío para guardarla." };
      }
      const def: CompositeDef = { id: `c-${s.nextId}`, name: trimmed, qubits: s.numQubits, ops: toCircuit(s).ops };
      return { composites: [...s.composites, def], nextId: s.nextId + 1, error: null };
    }),

  insertComposite: (id, baseQubit) =>
    set((s) => {
      const def = s.composites.find((c) => c.id === id);
      if (!def) return {};
      const base = Math.max(0, Math.floor(baseQubit));
      if (base + def.qubits > s.numQubits) {
        return { error: `${def.name} necesita ${def.qubits} qubits desde q${base}; no caben en ${s.numQubits}.` };
      }
      const expanded = expandComposite(def, base);
      // ASAP-schedule the expanded ops, appended after the current circuit
      const lastUsed = new Array(s.numQubits).fill(-1);
      for (const p of s.placements) for (const q of p.qubits) if (p.column > lastUsed[q]) lastUsed[q] = p.column;
      const added: PlacedOp[] = [];
      let nid = s.nextId;
      for (const op of expanded) {
        let col = 0;
        for (const q of op.qubits) if (lastUsed[q] + 1 > col) col = lastUsed[q] + 1;
        for (const q of op.qubits) lastUsed[q] = col;
        const placement: PlacedOp = { id: `op-${nid}`, gate: op.gate, qubits: [...op.qubits], column: col };
        if (op.params) placement.params = { ...op.params };
        if (op.openControls && op.openControls.length) placement.openControls = [...op.openControls];
        if (op.clbit !== undefined) placement.clbit = op.clbit;
        if (op.condition) placement.condition = { ...op.condition };
        added.push(placement);
        nid++;
      }
      return { ...pushHistory(s), placements: [...s.placements, ...added], nextId: nid, error: null };
    }),

  deleteComposite: (id) =>
    set((s) => ({ composites: s.composites.filter((c) => c.id !== id || c.builtin === true) })),
}));

// --- exported pure selectors/helpers (plain functions, NOT hooks) ---

/** Sort placements by column (stable) and strip id/column → engine Circuit. */
export function toCircuit(s: { numQubits: number; placements: PlacedOp[] }): Circuit {
  const sorted = [...s.placements].sort((a, b) => a.column - b.column);
  const ops: Operation[] = sorted.map((p) => {
    const op: Operation = { gate: p.gate, qubits: [...p.qubits] };
    if (p.params) op.params = { ...p.params };
    if (p.openControls && p.openControls.length) op.openControls = [...p.openControls];
    if (p.clbit !== undefined) op.clbit = p.clbit;
    if (p.condition) op.condition = { ...p.condition };
    return op;
  });
  return { qubits: s.numQubits, clbits: s.numQubits, ops };
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
/** Fixed seed for the single trajectory shown in the step-by-step panels, so all
 * panels display the SAME run. Override via `seed` to re-roll. */
const VIEW_SEED = 20260918;

export function currentState(s: { numQubits: number; placements: PlacedOp[]; step: number; seed?: number }): StateVector {
  // ops up to the current column (exclusive), in execution order
  const partial = [...s.placements].filter((p) => p.column < s.step).sort((a, b) => a.column - b.column);
  const ops: Operation[] = partial.map((p) => {
    const op: Operation = { gate: p.gate, qubits: [...p.qubits] };
    if (p.params) op.params = { ...p.params };
    if (p.openControls && p.openControls.length) op.openControls = [...p.openControls];
    if (p.clbit !== undefined) op.clbit = p.clbit;
    if (p.condition) op.condition = { ...p.condition };
    return op;
  });
  if (!isStochastic(ops)) return stateAfterColumn(s.numQubits, s.placements, s.step); // pure fast path
  return runTrajectory({ qubits: s.numQubits, clbits: s.numQubits, ops }, makeRng(s.seed ?? VIEW_SEED)).state;
}

/** The placement covering (qubit, column), if any. */
export function placementAt(placements: PlacedOp[], qubit: number, column: number): PlacedOp | undefined {
  return placements.find((p) => p.column === column && p.qubits.includes(qubit));
}

/** Structural validation of the current grid via the engine's validate(). */
export function validateCircuit(s: { numQubits: number; placements: PlacedOp[] }): { ok: boolean; errors: string[] } {
  return validate(toCircuit(s));
}
