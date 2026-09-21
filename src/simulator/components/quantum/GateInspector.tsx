// Inspector for the currently selected placement in the Quantum Lab circuit.
// Reads the store's selectedId, resolves the PlacedOp, and shows its doc, matrix,
// qubit roles, moment, effects, one live slider per parameter (θ/φ/λ) and — for
// controlled gates — per-control open/closed (anti-control) toggles.
// Pure display/action surface: never throws during render; guards null + not-found.

import "katex/dist/katex.min.css";
import { useQuantum } from "../../quantum/quantumStore.ts";
import { getGateDoc } from "../../quantum/gateDocs.ts";
import { GATES } from "../../quantum/gates.ts";
import { tex, escapeHtml } from "../notebook/notebookRender.ts";

// Render inline "$...$" math inside a string (same split rule as notebookRender.inline).
const inlineMath = (t: string): string =>
  t.split(/\$([^$]+)\$/g).map((c, i) => (i % 2 ? tex(c) : escapeHtml(c))).join("");

const PLABEL: Record<"theta" | "phi" | "lambda", string> = { theta: "θ", phi: "φ", lambda: "λ" };

const placeholder = "flex h-full items-center justify-center px-4 text-center text-[11px] text-graphite";

export function GateInspector() {
  const selectedId = useQuantum((s) => s.selectedId);
  const placements = useQuantum((s) => s.placements);
  const updatePlacementParams = useQuantum((s) => s.updatePlacementParams);
  const removePlacement = useQuantum((s) => s.removePlacement);
  const setOpenControls = useQuantum((s) => s.setOpenControls);
  const setCondition = useQuantum((s) => s.setCondition);
  const setClbit = useQuantum((s) => s.setClbit);
  const numQubits = useQuantum((s) => s.numQubits);

  const op = selectedId === null ? undefined : placements.find((p) => p.id === selectedId);
  if (!op) return <div className={placeholder}>Selecciona una compuerta del circuito.</div>;

  const doc = getGateDoc(op.gate);
  const spec = GATES[op.gate];

  return (
    <div className="flex flex-col gap-3 overflow-y-auto p-4 scroll-thin">
      <div className="flex items-baseline gap-2">
        <span className="font-display text-lg text-ink">{doc.name}</span>
        <span className="font-mono text-[11px] text-vermilion-300">{doc.symbol}</span>
      </div>

      {doc.matrixTex && (
        <div
          className="katex-block overflow-x-auto rounded bg-black/40 px-4 py-3 text-ink ring-1 ring-white/5 scroll-thin"
          dangerouslySetInnerHTML={{ __html: tex(doc.matrixTex, true) }}
        />
      )}

      <div className="flex flex-col gap-1 text-[11px]">
        {spec.kind === "controlled" ? (
          <>
            <Row label="Control(es)">{op.qubits.slice(0, -1).map((q) => `q${q}`).join(", ") || "—"}</Row>
            <Row label="Objetivo">q{op.qubits[op.qubits.length - 1]}</Row>
          </>
        ) : spec.kind === "swap" ? (
          <Row label="Qubits">q{op.qubits[0]} ↔ q{op.qubits[1]}</Row>
        ) : (
          <Row label="Objetivo">{op.qubits.map((q) => `q${q}`).join(", ")}</Row>
        )}
        <Row label="Momento">columna {op.column}</Row>
      </div>

      {spec.kind === "controlled" && op.qubits.length > 1 && (
        <div className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-widest text-vermilion-300/70">Polaridad de control</span>
          <div className="flex flex-wrap gap-1.5">
            {op.qubits.slice(0, -1).map((c) => {
              const isOpen = op.openControls?.includes(c) ?? false;
              return (
                <button
                  key={c}
                  onClick={() => {
                    const cur = op.openControls ?? [];
                    const next = isOpen ? cur.filter((x) => x !== c) : [...cur, c];
                    setOpenControls(op.id, next);
                  }}
                  className={`focusable rounded border px-2 py-1 font-mono text-[11px] transition ${
                    isOpen
                      ? "border-vermilion-400/50 bg-vermilion-500/10 text-vermilion-200"
                      : "border-line bg-void-soft/50 text-ink hover:border-vermilion-400/40"
                  }`}
                  title={isOpen ? `q${c}: control abierto — activa en |0⟩` : `q${c}: control cerrado — activa en |1⟩`}
                  aria-label={isOpen ? `q${c} activa en |0⟩` : `q${c} activa en |1⟩`}
                  aria-pressed={isOpen}
                >
                  {isOpen ? `○  q${c}: activa en |0⟩` : `●  q${c}: activa en |1⟩`}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {op.gate === "M" && (
        <div className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-widest text-vermilion-300/70">Bit clásico destino</span>
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: numQubits }, (_, c) => {
              const active = (op.clbit ?? op.qubits[0]) === c;
              return (
                <button
                  key={c}
                  onClick={() => setClbit(op.id, c)}
                  aria-pressed={active}
                  aria-label={`Escribir en bit clásico c${c}`}
                  className={`focusable rounded border px-2 py-1 font-mono text-[11px] transition ${
                    active ? "border-vermilion-400/50 bg-vermilion-500/10 text-vermilion-200" : "border-line bg-void-soft/50 text-ink hover:border-vermilion-400/40"
                  }`}
                >
                  c{c}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {spec.kind !== "measure" && spec.kind !== "barrier" && (
        <div className="flex flex-col gap-1.5 rounded border border-line bg-void-soft/50 p-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-widest text-vermilion-300/70">Condición clásica (c_if)</span>
            <button
              onClick={() => setCondition(op.id, op.condition ? null : { clbit: 0, value: 1 })}
              className="focusable rounded border border-line px-2 py-0.5 text-[11px] text-vermilion-300 transition hover:border-vermilion-400/50"
              aria-label={op.condition ? "Quitar condición" : "Añadir condición"}
            >
              {op.condition ? "Quitar" : "Añadir"}
            </button>
          </div>
          {op.condition && (
            <div className="flex items-center gap-2 font-mono text-[11px] text-ink">
              <span className="text-graphite">si</span>
              <select
                value={op.condition.clbit}
                onChange={(e) => setCondition(op.id, { clbit: Number(e.target.value), value: op.condition!.value })}
                className="focusable rounded border border-line bg-black/40 px-1.5 py-0.5"
                aria-label="Bit clásico de la condición"
              >
                {Array.from({ length: numQubits }, (_, c) => (
                  <option key={c} value={c}>c{c}</option>
                ))}
              </select>
              <span className="text-graphite">==</span>
              <select
                value={op.condition.value}
                onChange={(e) => setCondition(op.id, { clbit: op.condition!.clbit, value: Number(e.target.value) === 1 ? 1 : 0 })}
                className="focusable rounded border border-line bg-black/40 px-1.5 py-0.5"
                aria-label="Valor de la condición"
              >
                <option value={0}>0</option>
                <option value={1}>1</option>
              </select>
            </div>
          )}
        </div>
      )}

      <Field label="Sobre |0⟩" html={inlineMath(doc.effect0)} />
      <Field label="Sobre |1⟩" html={inlineMath(doc.effect1)} />
      <Field label="Geometría" html={inlineMath(doc.geometry)} />

      {spec.params.map((param) => {
        const value = op.params?.[param] ?? 0;
        const sym = PLABEL[param];
        return (
          <div key={param} className="flex flex-col gap-1 rounded border border-line bg-void-soft/50 p-2">
            <div className="flex items-center justify-between text-[11px] text-graphite">
              <span>{sym}</span>
              <span className="font-mono tabular-nums text-vermilion-300">
                {value.toFixed(3)} rad · {((value * 180) / Math.PI).toFixed(1)}°
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={2 * Math.PI}
              step={0.01}
              value={value}
              onChange={(e) => updatePlacementParams(op.id, { [param]: Number(e.target.value) })}
              className="w-full focusable"
              title={`Ajustar ${sym}`}
              aria-label={`Ajustar ${sym}`}
            />
          </div>
        );
      })}

      <p className="text-[11px] leading-relaxed text-graphite">{doc.summary}</p>

      <button
        onClick={() => removePlacement(op.id)}
        className="focusable mt-1 self-start rounded border border-line px-3 py-1.5 text-[11px] text-vermilion-300 transition hover:border-vermilion-400/50 hover:bg-vermilion-500/10"
        title="Eliminar esta compuerta del circuito"
        aria-label="Eliminar compuerta"
      >
        Eliminar
      </button>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-graphite">{label}</span>
      <span className="font-mono text-ink">{children}</span>
    </div>
  );
}

function Field({ label, html }: { label: string; html: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-widest text-vermilion-300/70">{label}</span>
      <span className="text-[11px] leading-relaxed text-ink" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
