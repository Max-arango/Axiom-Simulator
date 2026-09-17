import { useState, type ReactNode } from "react";
import { QubitControls } from "./QubitControls.tsx";
import { GatePalette } from "./GatePalette.tsx";
import { PlaybackControls } from "./PlaybackControls.tsx";
import { ExamplesPanel } from "./ExamplesPanel.tsx";
import { ImportExportPanel } from "./ImportExportPanel.tsx";
import { CircuitGrid } from "./CircuitGrid.tsx";
import { StatePanel } from "./StatePanel.tsx";
import { MeasurementPanel } from "./MeasurementPanel.tsx";
import { BlochPanel } from "./BlochPanel.tsx";
import { EntanglementPanel } from "./EntanglementPanel.tsx";
import { GateInspector } from "./GateInspector.tsx";
import { LearnPanel } from "./LearnPanel.tsx";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="border-b border-line px-3 py-3">
      <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-graphite">{title}</h3>
      {children}
    </div>
  );
}

type Tab = "estado" | "medicion" | "bloch" | "entrelazamiento" | "inspector" | "aprender";
const TABS: { id: Tab; label: string }[] = [
  { id: "estado", label: "Statevector" },
  { id: "medicion", label: "Medición" },
  { id: "bloch", label: "Bloch" },
  { id: "entrelazamiento", label: "Entrelazamiento" },
  { id: "inspector", label: "Inspector" },
  { id: "aprender", label: "Aprender" },
];

export function QuantumLabView() {
  const [tab, setTab] = useState<Tab>("estado");

  return (
    <div className="flex h-full min-h-0 flex-1 bg-void text-ink">
      <aside className="scroll-thin w-[340px] shrink-0 overflow-y-auto border-r border-line bg-void-soft/40">
        <Section title="Qubits">
          <QubitControls />
        </Section>
        <Section title="Compuertas">
          <GatePalette />
        </Section>
        <Section title="Ejecución paso a paso">
          <PlaybackControls />
        </Section>
        <Section title="Ejemplos">
          <ExamplesPanel />
        </Section>
        <Section title="Importar / Exportar">
          <ImportExportPanel />
        </Section>
      </aside>

      <main className="flex min-h-0 flex-1 flex-col">
        <div className="scroll-thin max-h-[45%] shrink-0 overflow-auto border-b border-line p-4">
          <CircuitGrid />
        </div>

        <div className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-line px-3 py-1.5 scroll-thin">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`focusable shrink-0 rounded-sm px-3 py-1 text-xs font-medium transition ${
                tab === t.id
                  ? "bg-vermilion-500/15 text-vermilion-200 ring-1 ring-vermilion-400/40"
                  : "text-graphite hover:bg-white/5 hover:text-ink"
              }`}
              aria-label={t.label}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="scroll-thin min-h-0 flex-1 overflow-auto p-4">
          {tab === "estado" ? (
            <StatePanel />
          ) : tab === "medicion" ? (
            <MeasurementPanel />
          ) : tab === "bloch" ? (
            <BlochPanel />
          ) : tab === "entrelazamiento" ? (
            <EntanglementPanel />
          ) : tab === "inspector" ? (
            <GateInspector />
          ) : (
            <LearnPanel />
          )}
        </div>
      </main>
    </div>
  );
}
