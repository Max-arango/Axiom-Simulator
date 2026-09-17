import { useState } from "react";
import { useQuantum, currentState } from "../../quantum/quantumStore.ts";
import { stateRows, filterSort, totalProb, fmtAmp, type StateRow } from "./stateRows.ts";

const deg = (r: number) => `${((r * 180) / Math.PI).toFixed(0)}°`;

export function StatePanel() {
  const numQubits = useQuantum((s) => s.numQubits);
  const placements = useQuantum((s) => s.placements);
  const step = useQuantum((s) => s.step);
  const [hideZero, setHideZero] = useState(true);
  const [sortBy, setSortBy] = useState<"index" | "prob">("index");

  const state = currentState({ numQubits, placements, step });
  const all = stateRows(state, numQubits);
  const rows = filterSort(all, { hideZero, sortBy });
  const total = totalProb(all);
  const normOk = Math.abs(total - 1) < 1e-6;

  return (
    <div className="flex h-full flex-col text-ink">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-widest text-vermilion-300/80">Statevector</h3>
        <span
          className={`font-mono text-[11px] tabular-nums ${normOk ? "text-teal-300" : "text-amber-300"}`}
          title="Σ|α|² (norma del estado)"
        >
          Σ|α|² = {total.toFixed(6)}
        </span>
      </div>

      <div className="mb-2 flex flex-wrap items-center gap-3 text-[11px] text-graphite">
        <label className="focusable flex cursor-pointer items-center gap-1.5">
          <input type="checkbox" checked={hideZero} onChange={(e) => setHideZero(e.target.checked)} />
          ocultar amplitudes ≈0
        </label>
        <span className="flex items-center gap-1">
          orden:
          <button
            className={`focusable rounded px-1.5 py-0.5 ${sortBy === "index" ? "bg-white/10 text-ink" : "hover:text-ink"}`}
            onClick={() => setSortBy("index")}
            aria-label="Ordenar por índice"
          >
            índice
          </button>
          <button
            className={`focusable rounded px-1.5 py-0.5 ${sortBy === "prob" ? "bg-white/10 text-ink" : "hover:text-ink"}`}
            onClick={() => setSortBy("prob")}
            aria-label="Ordenar por probabilidad"
          >
            probabilidad
          </button>
        </span>
      </div>

      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto rounded-lg bg-black/30 ring-1 ring-white/5">
        <table className="w-full border-collapse font-mono text-[11px] tabular-nums">
          <thead className="sticky top-0 bg-void-soft/95 text-[10px] uppercase tracking-wide text-graphite backdrop-blur">
            <tr>
              <th className="px-2 py-1 text-left font-medium">base</th>
              <th className="px-2 py-1 text-right font-medium">amplitud</th>
              <th className="px-2 py-1 text-right font-medium">|α|</th>
              <th className="px-2 py-1 text-right font-medium">fase</th>
              <th className="px-2 py-1 text-right font-medium">P</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-2 py-3 text-center text-graphite">
                  sin amplitudes por encima del umbral
                </td>
              </tr>
            ) : (
              rows.map((r: StateRow) => (
                <tr key={r.index} className="border-t border-white/5 hover:bg-white/5">
                  <td className="px-2 py-1 text-vermilion-100">{r.label}</td>
                  <td className="px-2 py-1 text-right text-stone-200">{fmtAmp(r.re, r.im)}</td>
                  <td className="px-2 py-1 text-right text-stone-300">{r.mag.toFixed(3)}</td>
                  <td className="px-2 py-1 text-right text-stone-400">{r.mag > 1e-9 ? deg(r.phase) : "—"}</td>
                  <td className="px-2 py-1 text-right text-teal-200">{(r.prob * 100).toFixed(1)}%</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
