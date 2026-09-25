// Conway's Game of Life engine — pure TypeScript, zero React dependencies.
//
// Grid: flat Uint8Array, row-major, index = row * width + col.
// 0 = dead, 1 = alive.
//
// Double-buffer: `cells` is always the live state. nextGeneration() writes
// into scratch then swaps references — caller never sees a partial state.
//
// Boundary: finite. Cells outside [0, width) × [0, height) count as dead.

export class GameOfLifeEngine {
  width: number;
  height: number;
  cells: Uint8Array;
  private scratch: Uint8Array;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.cells = new Uint8Array(width * height);
    this.scratch = new Uint8Array(width * height);
  }

  getCell(row: number, col: number): number {
    if (row < 0 || row >= this.height || col < 0 || col >= this.width) return 0;
    return this.cells[row * this.width + col];
  }

  setCell(row: number, col: number, alive: boolean): void {
    if (row < 0 || row >= this.height || col < 0 || col >= this.width) return;
    this.cells[row * this.width + col] = alive ? 1 : 0;
  }

  toggleCell(row: number, col: number): boolean {
    if (row < 0 || row >= this.height || col < 0 || col >= this.width) return false;
    const idx = row * this.width + col;
    const next = this.cells[idx] ? 0 : 1;
    this.cells[idx] = next;
    return next === 1;
  }

  // O(W × H) per generation. Reads from cells, writes to scratch, then swaps.
  nextGeneration(): { births: number; deaths: number; population: number } {
    const { width, height } = this;
    const cur = this.cells;
    const nxt = this.scratch;
    let births = 0, deaths = 0, population = 0;

    for (let row = 0; row < height; row++) {
      const rMin = row > 0 ? row - 1 : 0;
      const rMax = row < height - 1 ? row + 1 : height - 1;
      for (let col = 0; col < width; col++) {
        const cMin = col > 0 ? col - 1 : 0;
        const cMax = col < width - 1 ? col + 1 : width - 1;

        let n = 0;
        for (let r = rMin; r <= rMax; r++) {
          const rowOff = r * width;
          for (let c = cMin; c <= cMax; c++) {
            if (r !== row || c !== col) n += cur[rowOff + c];
          }
        }

        const alive = cur[row * width + col];
        let next: number;
        if (alive) {
          next = (n === 2 || n === 3) ? 1 : 0;
          if (!next) deaths++;
        } else {
          next = n === 3 ? 1 : 0;
          if (next) births++;
        }
        nxt[row * width + col] = next;
        population += next;
      }
    }

    this.cells = nxt;
    this.scratch = cur;
    return { births, deaths, population };
  }

  getPopulation(): number {
    let pop = 0;
    const len = this.cells.length;
    for (let i = 0; i < len; i++) pop += this.cells[i];
    return pop;
  }

  clear(): void {
    this.cells.fill(0);
    this.scratch.fill(0);
  }

  // Seeded LCG for reproducibility. Default seed = 42.
  randomize(density: number, seed = 42): void {
    let s = (seed >>> 0) || 1;
    const len = this.cells.length;
    for (let i = 0; i < len; i++) {
      s = (Math.imul(s, 1664525) + 1013904223) | 0;
      this.cells[i] = ((s >>> 16) & 0xffff) / 65535 < density ? 1 : 0;
    }
  }

  placePattern(patternCells: ReadonlyArray<readonly [number, number]>, row: number, col: number): void {
    for (const [dr, dc] of patternCells) {
      this.setCell(row + dr, col + dc, true);
    }
  }

  // Returns new engine with resized grid, copying as much state as fits.
  resize(newWidth: number, newHeight: number): GameOfLifeEngine {
    const next = new GameOfLifeEngine(newWidth, newHeight);
    const copyH = Math.min(this.height, newHeight);
    const copyW = Math.min(this.width, newWidth);
    for (let r = 0; r < copyH; r++) {
      for (let c = 0; c < copyW; c++) {
        next.cells[r * newWidth + c] = this.cells[r * this.width + c];
      }
    }
    return next;
  }

  clone(): GameOfLifeEngine {
    const copy = new GameOfLifeEngine(this.width, this.height);
    copy.cells.set(this.cells);
    return copy;
  }
}
