import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { CanvasControls } from "@/simulator/components/CanvasControls.tsx";
import { heat2d } from "@/simulator/mathlab/pde/heat2d.ts";
import type { Heat2DParams, Heat2DResult } from "@/simulator/mathlab/pde/heat2d.ts";
import { buildGrid } from "@/simulator/mathlab/pde/grid.ts";
import type { Grid1D } from "@/simulator/mathlab/pde/types.ts";
import { NumericalInstabilityError, InvalidInputError, ResourceLimitError } from "@/simulator/mathlab/core/errors.ts";

function makeGrid1D(xMin: number, xMax: number, nx: number): Grid1D {
  return { xMin, xMax, nx };
}

function computeMaxStableDt(gridX: Grid1D, gridY: Grid1D, alpha: number): number {
  const x = buildGrid(gridX);
  const y = buildGrid(gridY);
  const dx = x[1] - x[0];
  const dy = y[1] - y[0];
  // FTCS stability: rx + ry = alpha * dt * (1/dx^2 + 1/dy^2) <= 0.5
  // dt <= 0.5 / (alpha * (1/dx^2 + 1/dy^2))
  return 0.5 / (alpha * (1 / (dx * dx) + 1 / (dy * dy)));
}

const DEFAULT_GRID_X: Grid1D = makeGrid1D(-5, 5, 50);
const DEFAULT_GRID_Y: Grid1D = makeGrid1D(-5, 5, 50);
const DEFAULT_ALPHA = 0.5;
const DEFAULT_DT = computeMaxStableDt(DEFAULT_GRID_X, DEFAULT_GRID_Y, DEFAULT_ALPHA) * 0.8; // 80% of stability limit for safety margin
const DEFAULT_STEPS = 50;

const defaultSimParams: Heat2DParams = {
  gridX: DEFAULT_GRID_X,
  gridY: DEFAULT_GRID_Y,
  alpha: DEFAULT_ALPHA,
  dt: DEFAULT_DT,
  steps: DEFAULT_STEPS,
  initial: (x: number, y: number) => {
    // Initial condition: a hot spot at the center
    const r = Math.sqrt(x * x + y * y);
    return Math.exp(-(r * r) / 2); // Gaussian
  },
  boundary: {
    bottom: 0,
    top: 0,
    left: 0,
    right: 0,
  },
};

/**
 * Thermal workspace for simulating heat diffusion.
 * Shows a 2D grid with temperature distribution and controls to adjust parameters.
 */
export function ThermalWorkspace() {
  const [stats, setStats] = useState({ fps: 0, ms: 0, width: 0, height: 0 });
  const [uiHidden, setUiHidden] = useState(false);
  const [simParams, setSimParams] = useState<Heat2DParams>(defaultSimParams);
  const [playing, setPlaying] = useState(false);
  const [currentTimeIndex, setCurrentTimeIndex] = useState(0);

  // Memoize simulation result (no side effects)
  const simulationData = useMemo(() => {
    try {
      const res = heat2d(simParams);
      // Compute global min and max over all time steps and grid points
      let globalMin = Infinity;
      let globalMax = -Infinity;
      const { u } = res;
      for (let t = 0; t < u.length; t++) {
        const nx = u[t].length;
        const ny = u[t][0].length;
        for (let i = 0; i < nx; i++) {
          for (let j = 0; j < ny; j++) {
            const val = u[t][i][j];
            if (val < globalMin) globalMin = val;
            if (val > globalMax) globalMax = val;
          }
        }
      }
      return {
        result: res,
        globalMin,
        globalMax,
        error: null as Error | null
      };
    } catch (e) {
      const err = e as Error;
      return {
        result: null as Heat2DResult | null,
        globalMin: 0,
        globalMax: 1,
        error: err
      };
    }
  }, [simParams]);

  const { result, globalMin, globalMax, error } = simulationData;

  // Use error directly from memo - no separate state needed
  const simulationError = error;

  // Clamp currentTimeIndex when result changes (e.g., steps changed)
  // Derived during render to avoid setState in effect
  const clampedTimeIndex = result
    ? Math.min(currentTimeIndex, result.t.length - 1)
    : 0;

  // Animation controls for time
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!playing || !result) return;
    const step = () => {
      setCurrentTimeIndex((prev) => {
        const clampedPrev = Math.min(prev, result.t.length - 1);
        const next = clampedPrev + 1;
        if (next >= result.t.length) {
          setPlaying(false);
          return result.t.length - 1; // Stay on last frame
        }
        return next;
      });
    };
    const delay = 100; // ms between frames
    const id = window.setTimeout(step, delay);
    animationFrameRef.current = id;
    return () => {
      if (animationFrameRef.current !== null) {
        window.clearTimeout(animationFrameRef.current);
      }
    };
  }, [playing, result]);

  // Keyboard controls: space to play/pause, arrow keys to step
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;
      if (e.key === " ") {
        e.preventDefault();
        setPlaying((p) => !p);
      } else if (e.key === "ArrowRight" && result) {
        setCurrentTimeIndex((prev) => Math.min(Math.min(prev, result.t.length - 1) + 1, result.t.length - 1));
      } else if (e.key === "ArrowLeft" && result) {
        setCurrentTimeIndex((prev) => Math.max(Math.min(prev, result.t.length - 1) - 1, 0));
      } else if (e.key === "Escape") {
        setUiHidden(false);
      } else if (e.key === "h" || e.key === "H") {
        setUiHidden((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [result]);

  // Handler for parameter updates that accepts both direct values and updater functions
  const handleParamsChange = useCallback(
    (update: Heat2DParams | ((prev: Heat2DParams) => Heat2DParams)) => {
      setSimParams(update);
      // Reset time index when parameters change
      setCurrentTimeIndex(0);
      // Stop playback when parameters change
      setPlaying(false);
    },
    []
  );

  return (
    <div className="relative min-h-0 flex-1 overflow-hidden">
      <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
        {simulationError ? (
          <SimulationErrorDisplay error={simulationError} />
        ) : result ? (
          <ThermalCanvas
            result={result}
            timeIndex={clampedTimeIndex}
            globalMin={globalMin}
            globalMax={globalMax}
          />
        ) : (
          <div className="text-white text-center p-4">
            Simulation error. Check console for details.
          </div>
        )}
      </div>

      {!uiHidden ? (
        <>
          <ThermalToolbar
            simParams={simParams}
            result={result}
            currentTimeIndex={clampedTimeIndex}
            playing={playing}
            onPlayPause={() => setPlaying((p) => !p)}
            onResetTime={() => setCurrentTimeIndex(0)}
            onSimulationParamsChange={handleParamsChange}
            defaultSimParams={defaultSimParams}
            simulationError={simulationError}
          />

          <div className="absolute bottom-3 left-3 top-[68px] z-20 w-[300px]">
            <ThermalPanel
              simParams={simParams}
              onChange={handleParamsChange}
            />
          </div>

          <CanvasControls />
        </>
      ) : (
        <button
          onClick={() => setUiHidden(false)}
          title="Show UI (H)"
          aria-label="Show UI"
          className="focusable absolute right-3 top-3 z-20 flex size-9 items-center justify-center rounded-lg border border-line bg-void-soft/70 text-graphite shadow-lg backdrop-blur-md transition hover:border-vermilion-400/50 hover:text-vermilion-200"
        >
          <svg viewBox="0 0 24 24" fill="none" className="size-4" aria-hidden>
            <path d="M2 12 C 5 6, 19 6, 22 12 C 19 18, 5 18, 2 12 Z" stroke="currentColor" strokeWidth="2" />
            <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
          </svg>
        </button>
      )}
    </div>
  );
}

function SimulationErrorDisplay({ error }: { error: Error }) {
  let message = error.message;
  let detail = "";

  if (error instanceof NumericalInstabilityError) {
    message = "Numerical instability";
    detail = "FTCS requires: rx + ry ≤ 0.5\n\n" + error.message;
  } else if (error instanceof InvalidInputError) {
    message = "Invalid input";
    detail = error.message;
  } else if (error instanceof ResourceLimitError) {
    message = "Resource limit exceeded";
    detail = error.message;
  }

  return (
    <div className="text-white text-center p-4 max-w-md mx-auto">
      <div className="text-lg font-semibold text-red-400 mb-2">{message}</div>
      <pre className="text-xs text-stone-300 text-left bg-stone-900/50 p-3 rounded overflow-auto">{detail}</pre>
    </div>
  );
}

/**
 * Simple canvas to render the heat distribution as a color map.
 */
function ThermalCanvas({
  result,
  timeIndex,
  globalMin,
  globalMax,
}: {
  result: Heat2DResult;
  timeIndex: number;
  globalMin: number;
  globalMax: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  // Handle responsive canvas sizing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const parent = canvas.parentElement;
      if (parent) {
        const rect = parent.getBoundingClientRect();
        const width = Math.floor(rect.width);
        const height = Math.floor(rect.height);
        if (width > 0 && height > 0 && (canvas.width !== width || canvas.height !== height)) {
          canvas.width = width;
          canvas.height = height;
          setCanvasSize({ width, height });
        }
      }
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas.parentElement!);
    return () => observer.disconnect();
  }, []);

  // Render the heatmap
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y, u } = result;
    const nx = x.length;
    const ny = y.length;

    // Validate timeIndex bounds
    if (timeIndex < 0 || timeIndex >= u.length) return;
    const tempSlice = u[timeIndex];

    // Use precomputed global min and max for coloring
    const range = globalMax - globalMin;
    const epsilon = 1e-12;
    const getColor = (value: number) => {
      // Map value to 0-1 range with robust handling of zero range
      let t = range > epsilon ? (value - globalMin) / range : 0.5;
      if (isNaN(t)) t = 0.5;
      t = Math.max(0, Math.min(1, t));
      // Blue cold -> red hot
      const r = Math.round(255 * t);
      const b = Math.round(255 * (1 - t));
      return `rgb(${r},0,${b})`;
    };

    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw each cell as a rectangle
    const cellWidth = width / nx;
    const cellHeight = height / ny;
    for (let i = 0; i < nx; i++) {
      for (let j = 0; j < ny; j++) {
        ctx.fillStyle = getColor(tempSlice[i][j]);
        ctx.fillRect(
          i * cellWidth,
          j * cellHeight,
          cellWidth,
          cellHeight
        );
      }
    }

    // Optional: draw grid lines
    ctx.strokeStyle = "rgba(255,255,255,0.1)";
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= nx; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cellWidth, 0);
      ctx.lineTo(i * cellWidth, height);
      ctx.stroke();
    }
    for (let j = 0; j <= ny; j++) {
      ctx.beginPath();
      ctx.moveTo(0, j * cellHeight);
      ctx.lineTo(width, j * cellHeight);
      ctx.stroke();
    }
  }, [result, timeIndex, globalMin, globalMax, canvasSize]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full border border-white/20"
      style={{ width: "100%", height: "100%" }}
    />
  );
}

/**
 * Toolbar for thermal workspace with play/pause and time controls.
 */
function ThermalToolbar({
  simParams,
  result,
  currentTimeIndex,
  playing,
  onPlayPause,
  onResetTime,
  onSimulationParamsChange,
  defaultSimParams,
  simulationError,
}: {
  simParams: Heat2DParams;
  result: Heat2DResult | null;
  currentTimeIndex: number;
  playing: boolean;
  onPlayPause: () => void;
  onResetTime: () => void;
  onSimulationParamsChange: (update: Heat2DParams | ((prev: Heat2DParams) => Heat2DParams)) => void;
  defaultSimParams: Heat2DParams;
  simulationError: Error | null;
}) {
  const handleAlphaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    onSimulationParamsChange((prev) => ({ ...prev, alpha: value }));
  };

  const handleDtChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    onSimulationParamsChange((prev) => ({ ...prev, dt: value }));
  };

  const handleStepsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    onSimulationParamsChange((prev) => ({ ...prev, steps: value }));
  };

  const handleResetAll = () => {
    onSimulationParamsChange(defaultSimParams);
    onResetTime();
    if (playing) {
      onPlayPause();
    }
  };

  const maxStableDt = computeMaxStableDt(simParams.gridX, simParams.gridY, simParams.alpha);
  const stabilityRatio = simParams.dt / maxStableDt;

  return (
    <div className="absolute bottom-3 left-3 right-3 z-20 flex flex-wrap gap-2 items-end">
      <div className="flex flex-col gap-1">
        <label className="text-xs text-graphite">α (diffusivity)</label>
        <input
          type="number"
          min={0.01}
          max={5}
          step={0.01}
          value={simParams.alpha}
          onChange={handleAlphaChange}
          className="w-20 rounded border border-line bg-white/20 text-xs text-white focus:border-vermilion-400 focus:ring-vermilion-400"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-graphite">dt</label>
        <input
          type="number"
          min={0.0001}
          max={1}
          step={0.0001}
          value={simParams.dt}
          onChange={handleDtChange}
          className="w-20 rounded border border-line bg-white/20 text-xs text-white focus:border-vermilion-400 focus:ring-vermilion-400"
        />
        <div className="text-[10px] text-stone-500">
          Max stable: {maxStableDt.toExponential(2)}
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-graphite">Steps</label>
        <input
          type="number"
          min={1}
          max={200}
          step={1}
          value={simParams.steps}
          onChange={handleStepsChange}
          className="w-20 rounded border border-line bg-white/20 text-xs text-white focus:border-vermilion-400 focus:ring-vermilion-400"
        />
      </div>
      <div className="flex flex-col gap-1">
        <button
          onClick={onPlayPause}
          disabled={!result || simulationError !== null}
          className="flex size-9 items-center justify-center rounded-lg border border-line bg-void-soft/80 text-[17px] leading-none text-ink shadow-lg backdrop-blur-md transition hover:border-vermilion-400/50 hover:text-vermilion-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {playing ? "❚❚" : "▶"}
        </button>
        <button
          onClick={onResetTime}
          disabled={!result}
          className="flex size-9 items-center justify-center rounded-lg border border-line bg-void-soft/80 text-[17px] leading-none text-ink shadow-lg backdrop-blur-md transition hover:border-vermilion-400/50 hover:text-vermilion-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ⟲
        </button>
        <button
          onClick={handleResetAll}
          title="Reset All"
          className="flex size-9 items-center justify-center rounded-lg border border-line bg-void-soft/80 text-[17px] leading-none text-ink shadow-lg backdrop-blur-md transition hover:border-vermilion-400/50 hover:text-vermilion-200"
        >
          ⤢
        </button>
      </div>
      {result && (
        <div className="flex flex-col gap-1 text-xs text-graphite">
          <div>Time: {result.t[currentTimeIndex].toFixed(3)} s</div>
          <div>Step: {currentTimeIndex + 1}/{result.t.length}</div>
          <div className={stabilityRatio > 0.95 ? "text-yellow-400" : "text-green-400"}>
            rx+ry: {result.stabilityNumber.toFixed(3)} {stabilityRatio > 0.95 ? "(near limit)" : "(stable)"}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Panel for detailed thermal simulation controls (initial condition, boundary, etc.)
 * For now, we keep it simple and just show the parameters.
 * In a full implementation, we would have more controls for initial/boundary conditions.
 */
function ThermalPanel({
  simParams,
  onChange,
}: {
  simParams: Heat2DParams;
  onChange: (update: Heat2DParams | ((prev: Heat2DParams) => Heat2DParams)) => void;
}) {
  const [initialPreset, setInitialPreset] = useState<'hot-center' | 'hot-edge' | 'uniform'>('hot-center');

  const handleInitialPresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const preset = e.target.value as 'hot-center' | 'hot-edge' | 'uniform';
    setInitialPreset(preset);
    let initialFn: Heat2DParams['initial'];
    switch (preset) {
      case 'hot-center':
        initialFn = (x: number, y: number) => {
          const r = Math.sqrt(x * x + y * y);
          return Math.exp(-(r * r) / 2);
        };
        break;
      case 'hot-edge':
        initialFn = (x: number, y: number) => {
          const maxX = simParams.gridX.xMax;
          const maxY = simParams.gridY.xMax;
          const dx = Math.abs(x) / maxX;
          const dy = Math.abs(y) / maxY;
          return Math.max(dx, dy);
        };
        break;
      case 'uniform':
        initialFn = () => 1.0;
        break;
    }
    onChange((prev) => ({ ...prev, initial: initialFn }));
  };

  const handleGridXChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    onChange((prev) => ({
      ...prev,
      gridX: { ...prev.gridX, nx: value },
    }));
  };

  const handleGridYChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    onChange((prev) => ({
      ...prev,
      gridY: { ...prev.gridY, nx: value },
    }));
  };

  return (
    <div className="space-y-4 p-4 rounded-lg border border-white/10 bg-void-soft/50 backdrop-blur-md">
      <h3 className="text-sm font-medium text-white mb-2">Simulation Parameters</h3>
      <div className="space-y-2 text-xs text-graphite">
        <div>
          <label className="mr-2">Grid size:</label>
          <input
            type="number"
            min={10}
            max={200}
            step={1}
            value={simParams.gridX.nx}
            onChange={handleGridXChange}
            className="w-16 rounded border border-line bg-white/20 text-xs text-white focus:border-vermilion-400 focus:ring-vermilion-400"
          /> ×{" "}
          <input
            type="number"
            min={10}
            max={200}
            step={1}
            value={simParams.gridY.nx}
            onChange={handleGridYChange}
            className="w-16 rounded border border-line bg-white/20 text-xs text-white focus:border-vermilion-400 focus:ring-vermilion-400"
          />
        </div>
        <div>
          <label className="mr-2">Domain:</label>
          <span>
            X: [{simParams.gridX.xMin}, {simParams.gridX.xMax}]
          </span>
          <br />
          <span>
            Y: [{simParams.gridY.xMin}, {simParams.gridY.xMax}]
          </span>
        </div>
        <div>
          <label className="mr-2">Boundary condition:</label>
          <span>All sides fixed at 0</span>
        </div>
        <div>
          <label className="mr-2">Initial condition:</label>
          <select
            value={initialPreset}
            onChange={handleInitialPresetChange}
            className="w-24 rounded border border-line bg-white/20 text-xs text-white focus:border-vermilion-400 focus:ring-vermilion-400"
          >
            <option value="hot-center">Hot Center</option>
            <option value="hot-edge">Hot Edge</option>
            <option value="uniform">Uniform</option>
          </select>
        </div>
      </div>
    </div>
  );
}