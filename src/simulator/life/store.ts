import { create } from "zustand";
import { GameOfLifeEngine } from "./engine.ts";
import { PATTERN_BY_ID } from "./patterns.ts";

const DEFAULT_WIDTH = 100;
const DEFAULT_HEIGHT = 80;
const MAX_DIM = 400;
const MAX_HISTORY = 300;

// Module-level singleton — canvas reads engine.cells directly, avoiding
// per-tick allocation of cell snapshots into React state.
let _engine = new GameOfLifeEngine(DEFAULT_WIDTH, DEFAULT_HEIGHT);

export function getEngine(): GameOfLifeEngine {
  return _engine;
}

interface LifeState {
  width: number;
  height: number;
  generation: number;
  population: number;
  births: number;
  deaths: number;
  running: boolean;
  speed: number;
  renderTick: number;
  cellSize: number;
  panX: number;
  panY: number;
  selectedPatternId: string | null;
  paintMode: "draw" | "erase";
  density: number;
  seed: number;
  history: Array<{ gen: number; pop: number }>;

  play(): void;
  pause(): void;
  toggle(): void;
  step(): void;
  tick(): void;
  reset(): void;
  clear(): void;
  randomize(): void;
  setSpeed(speed: number): void;
  setCell(row: number, col: number, alive: boolean): void;
  toggleCellAt(row: number, col: number): void;
  placePattern(id: string, row: number, col: number): void;
  setSelectedPattern(id: string | null): void;
  setPaintMode(mode: "draw" | "erase"): void;
  setCellSize(size: number): void;
  panBy(dx: number, dy: number): void;
  setPan(x: number, y: number): void;
  zoomAt(factor: number, pivotX: number, pivotY: number): void;
  setDensity(d: number): void;
  setSeed(s: number): void;
  resizeGrid(w: number, h: number): void;
}

export const useLifeStore = create<LifeState>((set, get) => ({
  width: DEFAULT_WIDTH,
  height: DEFAULT_HEIGHT,
  generation: 0,
  population: 0,
  births: 0,
  deaths: 0,
  running: false,
  speed: 10,
  renderTick: 0,
  cellSize: 8,
  panX: 0,
  panY: 0,
  selectedPatternId: null,
  paintMode: "draw",
  density: 0.3,
  seed: 42,
  history: [],

  play: () => set({ running: true }),
  pause: () => set({ running: false }),
  toggle: () => set((s) => ({ running: !s.running })),

  tick: () => {
    const { births, deaths, population } = _engine.nextGeneration();
    const gen = get().generation + 1;
    const hist = get().history;
    const entry = { gen, pop: population };
    const newHist = hist.length >= MAX_HISTORY ? [...hist.slice(1), entry] : [...hist, entry];
    set({ generation: gen, population, births, deaths, renderTick: get().renderTick + 1, history: newHist });
  },

  step: () => {
    const { births, deaths, population } = _engine.nextGeneration();
    const gen = get().generation + 1;
    const hist = get().history;
    const entry = { gen, pop: population };
    const newHist = hist.length >= MAX_HISTORY ? [...hist.slice(1), entry] : [...hist, entry];
    set({ running: false, generation: gen, population, births, deaths, renderTick: get().renderTick + 1, history: newHist });
  },

  reset: () => {
    _engine.clear();
    set({ generation: 0, population: 0, births: 0, deaths: 0, running: false, history: [], renderTick: get().renderTick + 1 });
  },

  clear: () => {
    _engine.clear();
    set({ population: 0, births: 0, deaths: 0, renderTick: get().renderTick + 1 });
  },

  randomize: () => {
    const { density, seed } = get();
    _engine.randomize(density, seed);
    const population = _engine.getPopulation();
    set({ generation: 0, population, births: 0, deaths: 0, history: [], renderTick: get().renderTick + 1 });
  },

  setSpeed: (speed) => set({ speed }),

  setCell: (row, col, alive) => {
    _engine.setCell(row, col, alive);
    set({ population: _engine.getPopulation(), renderTick: get().renderTick + 1 });
  },

  toggleCellAt: (row, col) => {
    _engine.toggleCell(row, col);
    set({ population: _engine.getPopulation(), renderTick: get().renderTick + 1 });
  },

  placePattern: (id, row, col) => {
    const p = PATTERN_BY_ID[id];
    if (!p) return;
    _engine.placePattern(p.cells, row, col);
    set({ population: _engine.getPopulation(), selectedPatternId: null, renderTick: get().renderTick + 1 });
  },

  setSelectedPattern: (id) => set({ selectedPatternId: id }),
  setPaintMode: (mode) => set({ paintMode: mode }),
  setCellSize: (size) => set({ cellSize: Math.max(2, Math.min(64, size)) }),

  panBy: (dx, dy) => set((s) => ({ panX: s.panX + dx, panY: s.panY + dy })),
  setPan: (x, y) => set({ panX: x, panY: y }),

  zoomAt: (factor, pivotX, pivotY) => {
    const { cellSize, panX, panY } = get();
    const newSize = Math.max(2, Math.min(64, cellSize * factor));
    const scale = newSize / cellSize;
    set({
      cellSize: newSize,
      panX: pivotX - (pivotX - panX) * scale,
      panY: pivotY - (pivotY - panY) * scale,
    });
  },

  setDensity: (d) => set({ density: Math.max(0.01, Math.min(1, d)) }),
  setSeed: (s) => set({ seed: s }),

  resizeGrid: (w, h) => {
    const cw = Math.max(10, Math.min(MAX_DIM, w));
    const ch = Math.max(10, Math.min(MAX_DIM, h));
    _engine = _engine.resize(cw, ch);
    set({ width: cw, height: ch, renderTick: get().renderTick + 1 });
  },
}));
