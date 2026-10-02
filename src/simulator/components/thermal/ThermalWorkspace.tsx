import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { CanvasControls } from "@/simulator/components/CanvasControls.tsx";
import { heat2d } from "@/simulator/mathlab/pde/heat2d.ts";
import type { Heat2DParams, Heat2DResult } from "@/simulator/mathlab/pde/heat2d.ts";
import { buildGrid } from "@/simulator/mathlab/pde/grid.ts";

const defaultSimParams: Heat2DParams = {
  gridX: { min: -5, max: 5, steps: 50 },
  gridY: { min: -5, max: 5, steps: 50 },
  alpha: 0.5,
  dt: 0.1,
  steps: 10,
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

  // Memoize simulation result to avoid setState in effect
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
        currentTimeIndex: res.t.length - 1,
        globalMin,
        globalMax
      };
    } catch (e) {
      console.error("Simulation error:", e);
      return {
        result: null,
        currentTimeIndex: 0,
        globalMin: 0,
        globalMax: 1
      };
    }
  }, [simParams]);

  const { result, currentTimeIndex, globalMin, globalMax } = simulationData;

  // Animation controls for time using ref to avoid setState in effect
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!playing || !result) return;
    const step = () => {
      setCurrentTimeIndex((prev) => {
        const next = prev + 1;
        if (next >= result.t.length) {
          setPlaying(false);
          return 0;
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
        setPlaying(!playing);
      } else if (e.key === "ArrowRight" && result) {
        setCurrentTimeIndex((prev) => (prev + 1) % result.t.length);
      } else if (e.key === "ArrowLeft" && result) {
        setCurrentTimeIndex((prev) => {
          const prevIdx = (prev - 1 + result.t.length) % result.t.length;
          return prevIdx;
        });
      } else if (e.key === "Escape") {
        setUiHidden(false);
      } else if (e.key === "h" || e.key === "H") {
        setUiHidden((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [playing, result]);

  return (
    <div className="relative min-h-0 flex-1 overflow-hidden">
      {/* Thermal Canvas - we'll create a simple div for now */}
      <div
        className="absolute inset-0 flex items-center justify-center bg-gray-900"
        style={{ width: "100%", height: "100%" }}
      >
        {result ? (
          <ThermalCanvas
            result={result}
            timeIndex={currentTimeIndex}
            width={800}
            height={600}
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
            currentTimeIndex={currentTimeIndex}
            playing={playing}
            onPlayPause={() => setPlaying(!playing)}
            onResetTime={() => setCurrentTimeIndex(0)}
            onSimulationParamsChange={setSimParams}
            defaultSimParams={defaultSimParams}
          />

          {/* Panel for detailed controls */}
          <div className="absolute bottom-3 left-3 top-[68px] z-20 w-[300px]">
            <ThermalPanel
              simParams={simParams}
              onChange={setSimParams}
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

/**
 * Simple canvas to render the heat distribution as a color map.
 */
function ThermalCanvas({
  result,
  timeIndex,
  width,
  height,
  globalMin,
  globalMax,
}: {
  result: Heat2DResult;
  timeIndex: number;
  width: number;
  height: number;
  globalMin: number;
  globalMax: number;
}) {
  const [canvasRef, setCanvasRef] = useState<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!canvasRef) return;
    const ctx = canvasRef.getContext("2d");
    if (!ctx) return;

    const { x, y, u } = result;
    const nx = x.length;
    const ny = y.length;
    const tempSlice = u[timeIndex];

    // Use precomputed global min and max for coloring
    const range = globalMax - globalMin;
    const getColor = (value: number) => {
      // Map value to 0-1 range
      let t = (value - globalMin) / range;
      if (isNaN(t)) t = 0;
      t = Math.max(0, Math.min(1, t));
      // Blue cold -> red hot
      const r = Math.round(255 * t);
      const b = Math.round(255 * (1 - t));
      return `rgb(${r},0,${b})`;
    };

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
  }, [result, timeIndex, width, height, canvasRef, globalMin, globalMax]);

  return (
    <canvas
      ref={setCanvasRef}
      width={width}
      height={height}
      className="border border-white/20"
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
}: {
  simParams: Heat2DParams;
  result: Heat2DResult | null;
  currentTimeIndex: number;
  playing: boolean;
  onPlayPause: () => void;
  onResetTime: () => void;
  onSimulationParamsChange: (params: Heat2DParams) => void;
  defaultSimParams: Heat2DParams;
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
          min={0.001}
          max={1}
          step={0.001}
          value={simParams.dt}
          onChange={handleDtChange}
          className="w-20 rounded border border-line bg-white/20 text-xs text-white focus:border-vermilion-400 focus:ring-vermilion-400"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-graphite">Steps</label>
        <input
          type="number"
          min={1}
          max={100}
          step={1}
          value={simParams.steps}
          onChange={handleStepsChange}
          className="w-20 rounded border border-line bg-white/20 text-xs text-white focus:border-vermilion-400 focus:ring-vermilion-400"
        />
      </div>
      <div className="flex flex-col gap-1">
        <button
          onClick={onPlayPause}
          className="flex size-9 items-center justify-center rounded-lg border border-line bg-void-soft/80 text-[17px] leading-none text-ink shadow-lg backdrop-blur-md transition hover:border-vermilion-400/50 hover:text-vermilion-200"
        >
          {playing ? "❚❚" : "▶"}
        </button>
        <button
          onClick={onResetTime}
          className="flex size-9 items-center justify-center rounded-lg border border-line bg-void-soft/80 text-[17px] leading-none text-ink shadow-lg backdrop-blur-md transition hover:border-vermilion-400/50 hover:text-vermilion-200"
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
  onChange: (params: Heat2DParams) => void;
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
          const maxX = simParams.gridX.max;
          const maxY = simParams.gridY.max;
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
      gridX: { ...prev.gridX, steps: value },
    }));
  };

  const handleGridYChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    onChange((prev) => ({
      ...prev,
      gridY: { ...prev.gridY, steps: value },
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
            value={simParams.gridX.steps}
            onChange={handleGridXChange}
            className="w-16 rounded border border-line bg-white/20 text-xs text-white focus:border-vermilion-400 focus:ring-vermilion-400"
          /> ×{" "}
          <input
            type="number"
            min={10}
            max={200}
            step={1}
            value={simParams.gridY.steps}
            onChange={handleGridYChange}
            className="w-16 rounded border border-line bg-white/20 text-xs text-white focus:border-vermilion-400 focus:ring-vermilion-400"
          />
        </div>
        <div>
          <label className="mr-2">Domain:</label>
          <span>
            X: [{simParams.gridX.min}, {simParams.gridX.max}]
          </span>
          <br />
          <span>
            Y: [{simParams.gridY.min}, {simParams.gridY.max}]
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