import { useQuantum } from "../../quantum/quantumStore.ts";
import { Bar } from "./Bar.tsx";

export function MeasurementPanel() {
  const shots = useQuantum((s) => s.shots);
  const seed = useQuantum((s) => s.seed);
  const results = useQuantum((s) => s.shotResults);
  const setShots = useQuantum((s) => s.setShots);
  const setSeed = useQuantum((s) => s.setSeed);
  const runShots = useQuantum((s) => s.runShots);

  const entries = results ? Object.entries(results).sort((a, b) => b[1] - a[1]) : [];
  const total = entries.reduce((s, [, c]) => s + c, 0);

  return (
    <div className="flex h-full flex-col text-ink">
      <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-vermilion-300/80">Medición (shots)</h3>

      <div className="mb-3 flex flex-wrap items-end gap-3 text-[11px]">
        <label className="flex flex-col gap-1 text-graphite">
          shots
          <input
            type="number"
            min={1}
            value={shots}
            onChange={(e) => setShots(Math.max(1, Math.floor(Number(e.target.value) || 1)))}
            className="focusable w-24 rounded bg-black/40 px-2 py-1 font-mono text-ink ring-1 ring-white/10"
            aria-label="Número de shots"
          />
        </label>
        <label className="flex flex-col gap-1 text-graphite">
          semilla
          <input
            type="number"
            value={seed}
            onChange={(e) => setSeed(Math.floor(Number(e.target.value) || 0))}
            className="focusable w-24 rounded bg-black/40 px-2 py-1 font-mono text-ink ring-1 ring-white/10"
            aria-label="Semilla del generador"
          />
        </label>
        <button
          onClick={runShots}
          className="focusable rounded bg-vermilion-500/20 px-3 py-1.5 font-semibold text-vermilion-100 ring-1 ring-vermilion-400/40 transition hover:bg-vermilion-500/35"
          aria-label="Ejecutar shots"
        >
          Ejecutar
        </button>
      </div>

      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto">
        {!results ? (
          <p className="text-[11px] leading-relaxed text-graphite">
            Ejecuta el circuito con muestreo repetido. Los resultados derivan del estado simulado
            (regla de Born) y son deterministas para una misma semilla.
          </p>
        ) : entries.length === 0 ? (
          <p className="text-[11px] text-graphite">Sin resultados.</p>
        ) : (
          <>
            <div className="mb-2 text-[10px] uppercase tracking-wide text-graphite">
              {total} shots · {entries.length} resultado(s) distinto(s)
            </div>
            <div className="space-y-1">
              {entries.map(([bits, count]) => (
                <div key={bits} className="flex items-center gap-2">
                  <span className="w-16 shrink-0 font-mono text-[11px] text-vermilion-100">|{bits}⟩</span>
                  <div className="flex-1">
                    <Bar label="" p={total ? count / total : 0} color="#3fb6a8" />
                  </div>
                  <span className="w-12 shrink-0 text-right font-mono text-[11px] tabular-nums text-stone-300">{count}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
