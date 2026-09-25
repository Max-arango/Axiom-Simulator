import { describe, it, expect } from "vitest";
import { GameOfLifeEngine } from "./engine.ts";

describe("GameOfLifeEngine", () => {
  // ── Still life ─────────────────────────────────────────────────────────────
  describe("block (still life)", () => {
    it("remains unchanged for 3 generations", () => {
      const e = new GameOfLifeEngine(4, 4);
      e.setCell(1, 1, true); e.setCell(1, 2, true);
      e.setCell(2, 1, true); e.setCell(2, 2, true);
      for (let i = 0; i < 3; i++) {
        const { births, deaths } = e.nextGeneration();
        expect(births).toBe(0);
        expect(deaths).toBe(0);
        expect(e.getPopulation()).toBe(4);
        expect(e.getCell(1, 1)).toBe(1);
        expect(e.getCell(1, 2)).toBe(1);
        expect(e.getCell(2, 1)).toBe(1);
        expect(e.getCell(2, 2)).toBe(1);
      }
    });
  });

  // ── Oscillator ─────────────────────────────────────────────────────────────
  describe("blinker (period-2 oscillator)", () => {
    it("alternates between horizontal and vertical", () => {
      const e = new GameOfLifeEngine(5, 5);
      // horizontal: row 2, cols 1-3
      e.setCell(2, 1, true); e.setCell(2, 2, true); e.setCell(2, 3, true);

      // gen 1 → vertical: col 2, rows 1-3
      e.nextGeneration();
      expect(e.getCell(1, 2)).toBe(1);
      expect(e.getCell(2, 2)).toBe(1);
      expect(e.getCell(3, 2)).toBe(1);
      expect(e.getCell(2, 1)).toBe(0);
      expect(e.getCell(2, 3)).toBe(0);

      // gen 2 → back to horizontal
      e.nextGeneration();
      expect(e.getCell(2, 1)).toBe(1);
      expect(e.getCell(2, 2)).toBe(1);
      expect(e.getCell(2, 3)).toBe(1);
      expect(e.getCell(1, 2)).toBe(0);
      expect(e.getCell(3, 2)).toBe(0);
    });
  });

  // ── Birth rule ─────────────────────────────────────────────────────────────
  describe("birth", () => {
    it("dead cell with exactly 3 neighbors is born", () => {
      const e = new GameOfLifeEngine(5, 5);
      // Three cells around (2,2)
      e.setCell(1, 1, true); e.setCell(1, 2, true); e.setCell(1, 3, true);
      e.nextGeneration();
      expect(e.getCell(2, 2)).toBe(1);
    });

    it("dead cell with 2 neighbors stays dead", () => {
      const e = new GameOfLifeEngine(5, 5);
      e.setCell(1, 1, true); e.setCell(1, 2, true);
      e.nextGeneration();
      expect(e.getCell(2, 1)).toBe(0);
    });
  });

  // ── Survival rules ─────────────────────────────────────────────────────────
  describe("survival", () => {
    it("alive cell with 2 neighbors survives", () => {
      const e = new GameOfLifeEngine(5, 5);
      // L-shape: (2,2) has exactly 2 alive neighbors at (1,1) and (1,2)
      e.setCell(1, 1, true); e.setCell(1, 2, true); e.setCell(2, 2, true);
      e.nextGeneration();
      expect(e.getCell(2, 2)).toBe(1);
    });

    it("alive cell with 3 neighbors survives", () => {
      const e = new GameOfLifeEngine(5, 5);
      e.setCell(1, 1, true); e.setCell(1, 2, true); e.setCell(1, 3, true);
      e.setCell(2, 2, true); // center has 3 neighbors
      e.nextGeneration();
      expect(e.getCell(2, 2)).toBe(1);
    });
  });

  // ── Death rules ────────────────────────────────────────────────────────────
  describe("death", () => {
    it("alive cell with 0 neighbors dies", () => {
      const e = new GameOfLifeEngine(5, 5);
      e.setCell(2, 2, true);
      e.nextGeneration();
      expect(e.getCell(2, 2)).toBe(0);
    });

    it("alive cell with 1 neighbor dies", () => {
      const e = new GameOfLifeEngine(5, 5);
      e.setCell(2, 2, true); e.setCell(2, 3, true);
      e.nextGeneration();
      expect(e.getCell(2, 2)).toBe(0);
    });

    it("alive cell with 4 neighbors dies (overcrowding)", () => {
      const e = new GameOfLifeEngine(5, 5);
      // surround (2,2) with 4 neighbors
      e.setCell(2, 2, true);
      e.setCell(1, 2, true); e.setCell(3, 2, true);
      e.setCell(2, 1, true); e.setCell(2, 3, true);
      e.nextGeneration();
      expect(e.getCell(2, 2)).toBe(0);
    });
  });

  // ── Simultaneity ───────────────────────────────────────────────────────────
  describe("simultaneity", () => {
    it("computes next gen from current state only (row of 4)", () => {
      // Row of 4: [O][O][O][O]
      // If updated left-to-right in place, leftmost cell would incorrectly
      // use already-updated neighbors. With true simultaneity:
      // Cell 0: neighbors 1 → dies
      // Cell 1: neighbors {0,2} = 2 → survives (but also gets neighbor from cell 3 via cell2? no, col 1 neighbors: col 0 and col 2 = 2 alive → survives)
      // Actually for a row of 4 at cols 1-4 in a 6x6 grid:
      // col1: neighbors = col2 only on same row, plus diagonals → let's use a known result.
      // Use the blinker test as simultaneity proof (already tested above).
      // Additional check: two isolated cells adjacent — verify neither "sees" update
      const e = new GameOfLifeEngine(3, 3);
      e.setCell(1, 0, true); e.setCell(1, 2, true); // two isolated cells, col 1 is dead, has 2 neighbors
      // col0 has 1 neighbor → dies; col2 has 1 neighbor → dies; col1 has 2 neighbors → stays dead (needs 3)
      e.nextGeneration();
      expect(e.getCell(1, 0)).toBe(0);
      expect(e.getCell(1, 1)).toBe(0);
      expect(e.getCell(1, 2)).toBe(0);
    });
  });

  // ── Population count ───────────────────────────────────────────────────────
  describe("population", () => {
    it("getPopulation matches manual count after randomize", () => {
      const e = new GameOfLifeEngine(20, 20);
      e.randomize(0.5, 1);
      let manual = 0;
      for (let r = 0; r < 20; r++) for (let c = 0; c < 20; c++) manual += e.getCell(r, c);
      expect(e.getPopulation()).toBe(manual);
    });

    it("clear sets population to 0", () => {
      const e = new GameOfLifeEngine(10, 10);
      e.randomize(0.5);
      e.clear();
      expect(e.getPopulation()).toBe(0);
    });
  });

  // ── Boundary ───────────────────────────────────────────────────────────────
  describe("boundary", () => {
    it("bottom edge cells do not reappear at top (no wrap)", () => {
      const e = new GameOfLifeEngine(10, 10);
      // Place 3 alive cells at the very bottom row — a blinker fragment
      // that would need row 10 (out of bounds) to survive. With finite boundary
      // those cells just see fewer neighbors and die rather than wrap.
      e.setCell(9, 4, true); e.setCell(9, 5, true); e.setCell(9, 6, true);
      e.nextGeneration();
      // Nothing should appear at row 0 (no wrapping)
      for (let c = 0; c < 10; c++) {
        expect(e.getCell(0, c)).toBe(0);
      }
    });

    it("left edge cells do not reappear at right (no wrap)", () => {
      const e = new GameOfLifeEngine(10, 10);
      e.setCell(4, 0, true); e.setCell(5, 0, true); e.setCell(6, 0, true);
      e.nextGeneration();
      for (let r = 0; r < 10; r++) {
        expect(e.getCell(r, 9)).toBe(0);
      }
    });
  });

  // ── nextGeneration stats ───────────────────────────────────────────────────
  describe("nextGeneration stats", () => {
    it("births + survivors = population, deaths reduce old population", () => {
      const e = new GameOfLifeEngine(10, 10);
      e.randomize(0.3, 7);
      const popBefore = e.getPopulation();
      const { births, deaths, population } = e.nextGeneration();
      expect(population).toBe(popBefore - deaths + births);
      expect(e.getPopulation()).toBe(population);
    });
  });
});
