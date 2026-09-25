import { useEffect, useRef } from "react";
import { useLifeStore, getEngine } from "../../life/store.ts";
import { PATTERN_BY_ID } from "../../life/patterns.ts";

const ALIVE_COLOR = "#e0673d";
const DEAD_COLOR = "#131311";
const GRID_COLOR = "rgba(240,238,229,0.06)";
const GHOST_COLOR = "rgba(224,103,61,0.35)";
const MAX_DPR = 2;

function screenToGrid(
  sx: number, sy: number, rect: DOMRect,
  panX: number, panY: number, cellSize: number,
): { row: number; col: number } {
  return {
    col: Math.floor((sx - rect.left - panX) / cellSize),
    row: Math.floor((sy - rect.top - panY) / cellSize),
  };
}

export function LifeCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dirty = useRef(true);
  const isPainting = useRef(false);
  const paintValue = useRef(true); // consistent draw/erase across one drag
  const hoverCell = useRef<{ row: number; col: number } | null>(null);

  // rAF render loop — reads store/engine directly each frame
  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      const w = Math.round(canvas.clientWidth * dpr);
      const h = Math.round(canvas.clientHeight * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w; canvas.height = h;
        dirty.current = true;
      }
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    const unsub = useLifeStore.subscribe(() => { dirty.current = true; });

    let raf = 0;
    let prevTick = -1;

    const render = () => {
      const state = useLifeStore.getState();
      const { cellSize, panX, panY, selectedPatternId } = state;
      const engine = getEngine();
      const { width, height, cells } = engine;
      const cw = canvas.width, ch = canvas.height;

      ctx.fillStyle = DEAD_COLOR;
      ctx.fillRect(0, 0, cw, ch);

      // Grid lines when cells are big enough to see them
      if (cellSize >= 6) {
        ctx.strokeStyle = GRID_COLOR;
        ctx.lineWidth = 1;
        const startCol = Math.max(0, Math.floor(-panX / cellSize));
        const endCol = Math.min(width, Math.ceil((cw - panX) / cellSize));
        const startRow = Math.max(0, Math.floor(-panY / cellSize));
        const endRow = Math.min(height, Math.ceil((ch - panY) / cellSize));
        ctx.beginPath();
        for (let c = startCol; c <= endCol; c++) {
          const x = c * cellSize + panX;
          ctx.moveTo(x, panY); ctx.lineTo(x, endRow * cellSize + panY);
        }
        for (let r = startRow; r <= endRow; r++) {
          const y = r * cellSize + panY;
          ctx.moveTo(panX, y); ctx.lineTo(endCol * cellSize + panX, y);
        }
        ctx.stroke();
      }

      // Alive cells
      const gap = cellSize >= 4 ? 1 : 0;
      const size = cellSize - gap;
      ctx.fillStyle = ALIVE_COLOR;
      for (let row = 0; row < height; row++) {
        const y = row * cellSize + panY;
        if (y + cellSize < 0 || y > ch) continue;
        const rowOff = row * width;
        for (let col = 0; col < width; col++) {
          if (!cells[rowOff + col]) continue;
          const x = col * cellSize + panX;
          if (x + cellSize < 0 || x > cw) continue;
          ctx.fillRect(x, y, size, size);
        }
      }

      // Ghost pattern at hover
      if (selectedPatternId && hoverCell.current) {
        const p = PATTERN_BY_ID[selectedPatternId];
        if (p) {
          ctx.fillStyle = GHOST_COLOR;
          const { row: hr, col: hc } = hoverCell.current;
          for (const [dr, dc] of p.cells) {
            ctx.fillRect((hc + dc) * cellSize + panX, (hr + dr) * cellSize + panY, size, size);
          }
        }
      }
    };

    const loop = () => {
      const tick = useLifeStore.getState().renderTick;
      if (tick !== prevTick || dirty.current) {
        prevTick = tick;
        dirty.current = false;
        render();
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      unsub();
    };
  }, []);

  // Mouse interactions
  const getRect = () => canvasRef.current!.getBoundingClientRect();

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const state = useLifeStore.getState();
    const rect = getRect();
    const { row, col } = screenToGrid(e.clientX, e.clientY, rect, state.panX, state.panY, state.cellSize);

    if (state.selectedPatternId) {
      state.placePattern(state.selectedPatternId, row, col);
      return;
    }

    const erasing = e.button === 2 || e.altKey;
    // Paint the opposite of current cell; erase always sets dead
    const target = erasing ? false : !getEngine().getCell(row, col);
    paintValue.current = target;
    isPainting.current = true;
    state.setCell(row, col, target);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const state = useLifeStore.getState();
    const rect = getRect();
    const { row, col } = screenToGrid(e.clientX, e.clientY, rect, state.panX, state.panY, state.cellSize);
    hoverCell.current = { row, col };
    dirty.current = true;

    if (!isPainting.current) return;
    state.setCell(row, col, paintValue.current);
  };

  const handleMouseUp = () => { isPainting.current = false; };
  const handleMouseLeave = () => { isPainting.current = false; hoverCell.current = null; dirty.current = true; };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const rect = getRect();
    const factor = e.deltaY < 0 ? 1.2 : 1 / 1.2;
    useLifeStore.getState().zoomAt(factor, e.clientX - rect.left, e.clientY - rect.top);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const s = useLifeStore.getState();
    const step = s.cellSize * 5;
    switch (e.key) {
      case "ArrowLeft":  s.panBy(step, 0); break;
      case "ArrowRight": s.panBy(-step, 0); break;
      case "ArrowUp":    s.panBy(0, step); break;
      case "ArrowDown":  s.panBy(0, -step); break;
    }
  };

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full cursor-crosshair"
      tabIndex={0}
      aria-label="Conway's Game of Life grid — click to toggle cells, scroll to zoom"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onContextMenu={(e) => e.preventDefault()}
      onWheel={handleWheel}
      onKeyDown={handleKeyDown}
    />
  );
}
