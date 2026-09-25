import { useState } from "react";
import { useLifeStore } from "../../life/store.ts";
import { PATTERNS, PATTERN_CATEGORIES, CATEGORY_LABELS, PATTERN_BY_ID, type PatternCategory } from "../../life/patterns.ts";
import { PopGraph } from "./PopGraph.tsx";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-line px-3 py-3">
      <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-graphite">{title}</h3>
      {children}
    </div>
  );
}

const btn = "flex items-center justify-center gap-1 rounded px-2.5 py-1 text-xs transition select-none";
const btnBase = `${btn} bg-white/5 hover:bg-white/10 text-ink`;
const btnAccent = `${btn} bg-vermilion-500/20 hover:bg-vermilion-500/30 text-vermilion-200 ring-1 ring-vermilion-400/40`;

const SPEEDS = [1, 2, 5, 10, 20, 50];
const CATEGORIES: PatternCategory[] = ["still-life", "oscillator", "spaceship", "gun"];

export function LifePanel() {
  const {
    running, play, pause, step, reset, clear, randomize,
    speed, setSpeed,
    generation, population, births, deaths, width, height,
    density, seed, setDensity, setSeed,
    selectedPatternId, setSelectedPattern,
    resizeGrid,
  } = useLifeStore();

  const [gridW, setGridW] = useState(width);
  const [gridH, setGridH] = useState(height);

  const density_pct = `${(density * 100).toFixed(0)}%`;
  const pop_density = ((population / (width * height)) * 100).toFixed(1);
  const selectedPattern = selectedPatternId ? PATTERN_BY_ID[selectedPatternId] : null;

  return (
    <div className="h-full overflow-y-auto scroll-thin">

      {/* Simulation controls */}
      <Section title="Simulation">
        <div className="flex flex-wrap gap-1.5">
          <button
            className={running ? btnAccent : btnBase}
            onClick={running ? pause : play}
            title={running ? "Pause (Space)" : "Play (Space)"}
            aria-label={running ? "Pause" : "Play"}
          >
            {running ? "⏸" : "▶"} {running ? "Pause" : "Play"}
          </button>
          <button className={btnBase} onClick={step} title="Step one generation (N)">⏭ Step</button>
          <button className={btnBase} onClick={reset} title="Reset (R)">↻ Reset</button>
          <button className={btnBase} onClick={clear} title="Clear (C)">✕ Clear</button>
        </div>
        <p className="mt-2 text-[10px] text-graphite">Space · N · R · C · Esc</p>
      </Section>

      {/* Speed */}
      <Section title="Speed">
        <div className="flex flex-wrap gap-1">
          {SPEEDS.map((s) => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className={s === speed ? btnAccent : btnBase}
              aria-pressed={s === speed}
            >
              {s}×
            </button>
          ))}
        </div>
      </Section>

      {/* Grid size */}
      <Section title="Grid">
        <div className="flex items-center gap-2 text-xs">
          <input
            type="number" value={gridW} min={10} max={400}
            onChange={(e) => setGridW(Number(e.target.value))}
            className="w-16 rounded bg-white/5 px-2 py-1 text-ink ring-1 ring-white/10 focus:ring-vermilion-400/40 outline-none"
            aria-label="Grid width"
          />
          <span className="text-graphite">×</span>
          <input
            type="number" value={gridH} min={10} max={400}
            onChange={(e) => setGridH(Number(e.target.value))}
            className="w-16 rounded bg-white/5 px-2 py-1 text-ink ring-1 ring-white/10 focus:ring-vermilion-400/40 outline-none"
            aria-label="Grid height"
          />
          <button
            className={btnBase}
            onClick={() => resizeGrid(gridW, gridH)}
          >
            Apply
          </button>
        </div>
        <p className="mt-1 text-[10px] text-graphite">Current: {width} × {height}</p>
      </Section>

      {/* Stats */}
      <Section title="Statistics">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs">
          {[
            ["Generation", generation.toLocaleString()],
            ["Population", population.toLocaleString()],
            ["Births", `+${births}`],
            ["Deaths", `-${deaths}`],
            ["Density", `${pop_density}%`],
          ].map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="text-graphite">{label}</dt>
              <dd className="font-mono text-ink tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
      </Section>

      {/* Randomize */}
      <Section title="Randomize">
        <div className="space-y-2 text-xs">
          <label className="flex items-center justify-between gap-2 text-graphite">
            <span>Density {density_pct}</span>
            <input
              type="range" min={0.05} max={0.7} step={0.05} value={density}
              onChange={(e) => setDensity(Number(e.target.value))}
              className="w-28 accent-vermilion-400"
              aria-label="Random density"
            />
          </label>
          <label className="flex items-center justify-between gap-2 text-graphite">
            <span>Seed</span>
            <input
              type="number" value={seed}
              onChange={(e) => setSeed(Number(e.target.value))}
              className="w-20 rounded bg-white/5 px-2 py-0.5 text-ink ring-1 ring-white/10 focus:ring-vermilion-400/40 outline-none"
              aria-label="Random seed"
            />
          </label>
          <button className={`${btnBase} w-full`} onClick={randomize}>Randomize</button>
        </div>
      </Section>

      {/* Population graph */}
      <Section title="Population">
        <PopGraph />
      </Section>

      {/* Pattern library */}
      <Section title="Patterns">
        {selectedPattern && (
          <div className="mb-2 rounded border border-vermilion-400/30 bg-vermilion-500/10 px-2 py-1.5 text-xs">
            <p className="font-medium text-vermilion-200">{selectedPattern.name}</p>
            <p className="mt-0.5 text-graphite">{selectedPattern.description}</p>
            {selectedPattern.period && <p className="mt-0.5 text-graphite">Period: {selectedPattern.period}</p>}
            <p className="mt-1 text-[10px] text-graphite">Click grid to place · Esc to cancel</p>
          </div>
        )}
        {CATEGORIES.map((cat) => (
          <div key={cat} className="mb-2">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-graphite/70">
              {CATEGORY_LABELS[cat]}
            </p>
            <div className="flex flex-wrap gap-1">
              {PATTERN_CATEGORIES[cat].map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPattern(selectedPatternId === p.id ? null : p.id)}
                  className={selectedPatternId === p.id ? btnAccent : btnBase}
                  title={p.description}
                  aria-pressed={selectedPatternId === p.id}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        ))}
      </Section>

      {/* About */}
      <Section title="About">
        <div className="space-y-1.5 text-xs text-graphite leading-relaxed">
          <p>
            Conway&apos;s Game of Life is a cellular automaton devised by mathematician John Conway in 1970.
            Each cell in an infinite 2D grid is alive or dead. Every generation evolves simultaneously by four rules:
          </p>
          <ul className="list-none space-y-0.5 font-mono text-[11px]">
            <li><span className="text-vermilion-300">Alive, &lt;2 neighbors</span> → dies (underpopulation)</li>
            <li><span className="text-vermilion-300">Alive, 2–3 neighbors</span> → survives</li>
            <li><span className="text-vermilion-300">Alive, &gt;3 neighbors</span> → dies (overcrowding)</li>
            <li><span className="text-vermilion-300">Dead, 3 neighbors</span> → born</li>
          </ul>
          <p>
            Neighbors are the 8 surrounding cells (Moore neighborhood).
            Simple rules produce complex emergent behavior: stable patterns, oscillators, spaceships, and universal computation.
          </p>
        </div>
      </Section>

    </div>
  );
}
