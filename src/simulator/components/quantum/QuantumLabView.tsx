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
import { QSpherePanel } from "./QSpherePanel.tsx";
import { QasmPanel } from "./QasmPanel.tsx";
import { UndoRedoButtons } from "./UndoRedoButtons.tsx";
import { ObservablesPanel } from "./ObservablesPanel.tsx";
import { CorrelationPanel } from "./CorrelationPanel.tsx";
import { PhaseDiskPanel } from "./PhaseDiskPanel.tsx";
import { CompositesPanel } from "./CompositesPanel.tsx";
import { MetricsBar } from "./MetricsBar.tsx";
import { SavedCircuitsPanel } from "./SavedCircuitsPanel.tsx";
import { KeyboardShortcuts } from "./KeyboardShortcuts.tsx";
import { NoisePanel } from "./NoisePanel.tsx";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="border-b border-line px-3 py-3">
      <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-graphite">{title}</h3>
      {children}
    </div>
  );
}

type Tab =
  | "estado" | "medicion" | "bloch" | "qsphere" | "fases"
  | "entrelazamiento" | "correlacion" | "observables"
  | "inspector" | "qasm" | "aprender";
const TABS: { id: Tab; label: string }[] = [
  { id: "estado", label: "Statevector" },
  { id: "medicion", label: "Medición" },
  { id: "bloch", label: "Bloch" },
  { id: "qsphere", label: "Q-sphere" },
  { id: "fases", label: "Fases" },
  { id: "entrelazamiento", label: "Entrelazamiento" },
  { id: "correlacion", label: "Info mutua" },
  { id: "observables", label: "Observables" },
  { id: "inspector", label: "Inspector" },
  { id: "qasm", label: "OpenQASM" },
  { id: "aprender", label: "Aprender" },
];

export function QuantumLabView() {
  const [tab, setTab] = useState<Tab>("estado");

  return (
    <div className="flex h-full min-h-0 flex-1 bg-void text-ink">
      <KeyboardShortcuts />
      <aside className="scroll-thin w-[340px] shrink-0 overflow-y-auto border-r border-line bg-void-soft/40">
        <div className="flex items-center gap-2 border-b border-line px-3 py-2">
          <UndoRedoButtons />
        </div>
        <Section title="Qubits">
          <QubitControls />
        </Section>
        <Section title="Compuertas">
          <GatePalette />
        </Section>
        <Section title="Ejecución paso a paso">
          <PlaybackControls />
        </Section>
        <Section title="Ruido (Monte-Carlo)">
          <NoisePanel />
        </Section>
        <Section title="Ejemplos">
          <ExamplesPanel />
        </Section>
        <Section title="Compuertas compuestas">
          <CompositesPanel />
        </Section>
        <Section title="Importar / Exportar">
          <ImportExportPanel />
        </Section>
        <Section title="Circuitos guardados">
          <SavedCircuitsPanel />
        </Section>
      </aside>

      <main className="flex min-h-0 flex-1 flex-col">
        <div className="scroll-thin max-h-[45%] shrink-0 overflow-auto border-b border-line p-4">
          <div className="mb-2">
            <MetricsBar />
          </div>
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
          ) : tab === "qsphere" ? (
            <QSpherePanel />
          ) : tab === "fases" ? (
            <PhaseDiskPanel />
          ) : tab === "entrelazamiento" ? (
            <EntanglementPanel />
          ) : tab === "correlacion" ? (
            <CorrelationPanel />
          ) : tab === "observables" ? (
            <ObservablesPanel />
          ) : tab === "inspector" ? (
            <GateInspector />
          ) : tab === "qasm" ? (
            <QasmPanel />
          ) : (
            <LearnPanel />
          )}
        </div>
      </main>
    </div>
  );
}
