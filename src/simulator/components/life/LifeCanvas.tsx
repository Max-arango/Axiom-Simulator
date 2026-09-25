import { useEffect, useRef } from "react";
import { useLifeStore, getEngine } from "../../life/store.ts";
import { PATTERN_BY_ID } from "../../life/patterns.ts";

const ALIVE = "#e0673d";
const ALIVE_GLOW = "rgba(224,103,61,0.22)";
const DEAD = "#131311";
const GRID_LINE = "rgba(240,238,229,0.055)";
const GHOST = "rgba(224,103,61,0.32)";
const HUD_BG = "rgba(19,19,17,0.72)";
const HUD_TEXT = "#a5a294";
const HUD_VALUE = "#f0eee5";
const MAX_DPR = 2;

function screenToGrid(
  sx: number, sy: number, rect: DOMRect,
  panX: number, panY: number, cellSize: number,
) {
  return {
    col: Math.floor((sx - rect.left - panX) / cellSize),
    row: Math.floor((sy - rect.top - panY) / cellSize),
  };
}

// Draw a rounded rect, falling back to plain rect on older browsers.
function fillRounded(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  if (r <= 0 || !ctx.roundRect) {
    ctx.fillRect(x, y, w, h);
    return;
  }
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
}

export function LifeCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dirty = useRef(true);
  const isPainting = useRef(false);
  const paintValue = useRef(true);
  const hoverCell = useRef<{ row: number; col: number } | null>(null);
  const isPanning = useRef(false);
  const panStart = useRef({ mx: 0, my: 0, px: 0, py: 0 });
  const spaceHeld = useRef(false);
  const centered = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;

    const center = () => {
      if (centered.current) return;
      centered.current = true;
      const s = useLifeStore.getState();
      const gridW = s.width * s.cellSize;
      const gridH = s.height * s.cellSize;
      const px = (canvas.clientWidth - gridW) / 2;
      const py = (canvas.clientHeight - gridH) / 2;
      useLifeStore.getState().setPan(px, py);
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      const w = Math.round(canvas.clientWidth * dpr);
      const h = Math.round(canvas.clientHeight * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        dirty.current = true;
        center();
      }
    };

    const ro = new ResizeObserver(() => { resize(); center(); });
    ro.observe(canvas);
    resize();

    const unsub = useLifeStore.subscribe(() => { dirty.current = true; });

    // Space key = pan mode
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !e.repeat) {
        const el = e.target as HTMLElement;
        if (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;
        spaceHeld.current = true;
        canvas.style.cursor = "grab";
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        spaceHeld.current = false;
        if (!isPanning.current) canvas.style.cursor = "crosshair";
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    let raf = 0;
    let prevTick = -1;

    const render = () => {
      const state = useLifeStore.getState();
      const { cellSize, panX, panY, selectedPatternId, running, speed, generation, population } = state;
      const engine = getEngine();
      const { width, height, cells } = engine;
      const cw = canvas.width;
      const ch = canvas.height;
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);

      // Background
      ctx.fillStyle = DEAD;
      ctx.fillRect(0, 0, cw, ch);

      // Grid lines
      if (cellSize >= 5) {
        ctx.strokeStyle = GRID_LINE;
        ctx.lineWidth = 1;
        const c0 = Math.max(0, Math.floor(-panX / cellSize));
        const c1 = Math.min(width, Math.ceil((cw - panX) / cellSize));
        const r0 = Math.max(0, Math.floor(-panY / cellSize));
        const r1 = Math.min(height, Math.ceil((ch - panY) / cellSize));
        ctx.beginPath();
        for (let c = c0; c <= c1; c++) {
          const x = c * cellSize + panX;
          ctx.moveTo(x, r0 * cellSize + panY);
          ctx.lineTo(x, r1 * cellSize + panY);
        }
        for (let r = r0; r <= r1; r++) {
          const y = r * cellSize + panY;
          ctx.moveTo(c0 * cellSize + panX, y);
          ctx.lineTo(c1 * cellSize + panX, y);
        }
        ctx.stroke();
      }

      // Glow pass (when zoomed in enough)
      const useGlow = cellSize >= 10;
      if (useGlow) {
        ctx.fillStyle = ALIVE_GLOW;
        const glowPad = Math.round(cellSize * 0.35);
        const glowSize = cellSize + glowPad * 2;
        for (let row = 0; row < height; row++) {
          const y = row * cellSize + panY;
          if (y + cellSize < -glowPad || y - glowPad > ch) continue;
          for (let col = 0; col < width; col++) {
            if (!cells[row * width + col]) continue;
            const x = col * cellSize + panX;
            if (x + cellSize < -glowPad || x - glowPad > cw) continue;
            fillRounded(ctx, x - glowPad, y - glowPad, glowSize, glowSize, glowPad);
          }
        }
      }

      // Alive cells
      const gap = cellSize >= 4 ? 1 : 0;
      const cellDraw = cellSize - gap;
      const radius = cellSize >= 6 ? Math.round(cellDraw * 0.22) : 0;
      ctx.fillStyle = ALIVE;
      for (let row = 0; row < height; row++) {
        const y = row * cellSize + panY;
        if (y + cellSize < 0 || y > ch) continue;
        const rowOff = row * width;
        for (let col = 0; col < width; col++) {
          if (!cells[rowOff + col]) continue;
          const x = col * cellSize + panX;
          if (x + cellSize < 0 || x > cw) continue;
          fillRounded(ctx, x, y, cellDraw, cellDraw, radius);
        }
      }

      // Ghost pattern at hover
      if (selectedPatternId && hoverCell.current) {
        const p = PATTERN_BY_ID[selectedPatternId];
        if (p) {
          ctx.fillStyle = GHOST;
          const { row: hr, col: hc } = hoverCell.current;
          for (const [dr, dc] of p.cells) {
            const x = (hc + dc) * cellSize + panX;
            const y = (hr + dr) * cellSize + panY;
            fillRounded(ctx, x, y, cellDraw, cellDraw, radius);
          }
        }
      }

      // HUD overlay (top-right corner)
      const hudPad = 10 * dpr;
      const lineH = 13 * dpr;
      const fontSize = 10 * dpr;
      const hudLines = [
        { label: "Gen", value: generation.toLocaleString() },
        { label: "Pop", value: population.toLocaleString() },
        { label: running ? "●" : "○", value: running ? `${speed}×` : "paused" },
      ];
      const hudW = 72 * dpr;
      const hudH = hudLines.length * lineH + hudPad;
      const hudX = cw - hudW - hudPad;
      const hudY = hudPad;

      ctx.fillStyle = HUD_BG;
      fillRounded(ctx, hudX - 6 * dpr, hudY - 4 * dpr, hudW + 12 * dpr, hudH + 8 * dpr, 6 * dpr);

      ctx.font = `${fontSize}px ui-monospace, "SF Mono", Menlo, monospace`;
      for (let i = 0; i < hudLines.length; i++) {
        const { label, value } = hudLines[i];
        const y = hudY + i * lineH + lineH * 0.75;
        ctx.fillStyle = HUD_TEXT;
        ctx.fillText(label, hudX, y);
        ctx.fillStyle = label === "●" ? "#e0673d" : HUD_VALUE;
        ctx.textAlign = "right";
        ctx.fillText(value, hudX + hudW, y);
        ctx.textAlign = "left";
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
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  const getRect = () => canvasRef.current!.getBoundingClientRect();

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const state = useLifeStore.getState();
    const rect = getRect();

    // Pan: middle button, or space+left
    if (e.button === 1 || (e.button === 0 && spaceHeld.current)) {
      isPanning.current = true;
      panStart.current = { mx: e.clientX, my: e.clientY, px: state.panX, py: state.panY };
      if (canvasRef.current) canvasRef.current.style.cursor = "grabbing";
      return;
    }

    const { row, col } = screenToGrid(e.clientX, e.clientY, rect, state.panX, state.panY, state.cellSize);

    if (state.selectedPatternId) {
      state.placePattern(state.selectedPatternId, row, col);
      return;
    }

    const erasing = e.button === 2 || e.altKey;
    const target = erasing ? false : !getEngine().getCell(row, col);
    paintValue.current = target;
    isPainting.current = true;
    state.setCell(row, col, target);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const state = useLifeStore.getState();
    const rect = getRect();

    if (isPanning.current) {
      const dx = e.clientX - panStart.current.mx;
      const dy = e.clientY - panStart.current.my;
      state.setPan(panStart.current.px + dx, panStart.current.py + dy);
      return;
    }

    const { row, col } = screenToGrid(e.clientX, e.clientY, rect, state.panX, state.panY, state.cellSize);
    hoverCell.current = { row, col };
    dirty.current = true;

    if (isPainting.current) state.setCell(row, col, paintValue.current);
  };

  const stopInteract = () => {
    isPainting.current = false;
    isPanning.current = false;
    if (canvasRef.current) canvasRef.current.style.cursor = spaceHeld.current ? "grab" : "crosshair";
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const rect = getRect();
    const factor = e.deltaY < 0 ? 1.2 : 1 / 1.2;
    useLifeStore.getState().zoomAt(factor, e.clientX - rect.left, e.clientY - rect.top);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Arrow pan only when canvas is focused and space is not held (space is for view pan)
    if (spaceHeld.current) return;
    const s = useLifeStore.getState();
    const step = s.cellSize * 4;
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
      className="absolute inset-0 h-full w-full cursor-crosshair select-none outline-none"
      tabIndex={0}
      aria-label="Conway's Game of Life grid — click to toggle cells, scroll to zoom, middle-drag or Space+drag to pan"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={stopInteract}
      onMouseLeave={() => { stopInteract(); hoverCell.current = null; dirty.current = true; }}
      onContextMenu={(e) => e.preventDefault()}
      onWheel={handleWheel}
      onKeyDown={handleKeyDown}
    />
  );
}
