// Preset gallery: lists ALGORITHMS and loads any into the store on demand.
// Loading REPLACES the current circuit (loadCircuit resets placements/step).

import { useQuantum } from "../../quantum/quantumStore.ts";
import { ALGORITHMS } from "../../quantum/algorithms.ts";

export function ExamplesPanel() {
  const loadCircuit = useQuantum((s) => s.loadCircuit);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <p className="border-b border-line px-4 py-2 text-[11px] text-graphite">
        Cargar un ejemplo reemplaza el circuito actual.
      </p>
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3 scroll-thin">
        {ALGORITHMS.map((preset) => (
          <div key={preset.id} className="flex items-start gap-3 rounded border border-line bg-void-soft/50 p-3">
            <div className="min-w-0 flex-1">
              <div className="font-display text-sm text-ink">{preset.name}</div>
              <p className="mt-0.5 text-[11px] leading-relaxed text-graphite">{preset.description}</p>
            </div>
            <button
              onClick={() => loadCircuit(preset.circuit)}
              className="focusable shrink-0 rounded border border-line px-3 py-1.5 text-[11px] text-vermilion-300 transition hover:border-vermilion-400/50 hover:bg-vermilion-500/10"
              title={`Cargar el circuito ${preset.name}`}
              aria-label={`Cargar ${preset.name}`}
            >
              Cargar
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
