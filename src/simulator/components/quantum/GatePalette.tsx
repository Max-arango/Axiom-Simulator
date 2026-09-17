import { useQuantum, type Pending } from "../../quantum/quantumStore.ts";
import { GATES } from "../../quantum/gates.ts";
import { getGateDoc } from "../../quantum/gateDocs.ts";
import type { GateId } from "../../quantum/types.ts";

const GROUPS: { title: string; ids: GateId[] }[] = [
  { title: "Simples", ids: ["I", "X", "Y", "Z", "H", "S", "Sdg", "T", "Tdg"] },
  { title: "Paramétricas", ids: ["RX", "RY", "RZ", "PHASE"] },
  { title: "Multi-qubit", ids: ["CX", "CZ", "SWAP", "CCX"] },
  { title: "Medición", ids: ["M"] },
];

const TAU = 2 * Math.PI;
const deg = (r: number) => `${((r * 180) / Math.PI).toFixed(0)}°`;

/** What to ask the user for next while staging a multi-qubit gate. */
function pendingHint(pending: Pending): string {
  const spec = GATES[pending.gate];
  const symbol = getGateDoc(pending.gate).symbol;
  const remaining = spec.arity - pending.qubits.length;
  if (spec.kind === "swap") return `${symbol}: elige el otro qubit a intercambiar`;
  if (remaining <= 1) return `${symbol}: elige el qubit objetivo`;
  return `${symbol}: elige un qubit de control (${remaining} restantes)`;
}

export function GatePalette() {
  const selectedGate = useQuantum((s) => s.selectedGate);
  const draftParams = useQuantum((s) => s.draftParams);
  const pending = useQuantum((s) => s.pending);
  const error = useQuantum((s) => s.error);
  const selectGate = useQuantum((s) => s.selectGate);
  const setDraftParam = useQuantum((s) => s.setDraftParam);
  const cancelPending = useQuantum((s) => s.cancelPending);

  const parametric = selectedGate !== null && getGateDoc(selectedGate).parametric === true;
  const paramKey = parametric ? GATES[selectedGate as GateId].params[0] : null;
  const paramValue = paramKey ? draftParams[paramKey] ?? 0 : 0;
  const paramLabel = paramKey === "phi" ? "φ" : "θ";

  return (
    <div className="flex flex-col gap-3 font-mono text-ink">
      {GROUPS.map((group) => (
        <div key={group.title}>
          <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-widest text-vermilion-300/70 font-display">
            {group.title}
          </h3>
          <div className="grid grid-cols-4 gap-1.5">
            {group.ids.map((id) => {
              const active = selectedGate === id;
              return (
                <button
                  key={id}
                  title={getGateDoc(id).name}
                  aria-label={getGateDoc(id).name}
                  aria-pressed={active}
                  onClick={() => selectGate(id)}
                  className={`flex h-9 items-center justify-center rounded border text-[13px] transition focusable ${
                    active
                      ? "border-vermilion-400/60 bg-vermilion-500/25 text-vermilion-100"
                      : "border-line bg-void-soft/85 text-ink hover:border-vermilion-400/40 hover:text-vermilion-200"
                  }`}
                >
                  {getGateDoc(id).symbol}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {paramKey && (
        <div className="rounded border border-line bg-void-soft/85 px-3 py-2 ring-1 ring-white/5">
          <div className="mb-1 flex items-center justify-between text-[11px] text-graphite">
            <span>
              {paramLabel} de {getGateDoc(selectedGate as GateId).symbol}
            </span>
            <span className="font-mono text-vermilion-200 tabular-nums">
              {paramValue.toFixed(2)} rad · {deg(paramValue)}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={TAU}
            step={0.01}
            value={paramValue}
            aria-label={`Ángulo ${paramLabel}`}
            onChange={(e) => setDraftParam(paramKey, Number(e.target.value))}
            className="w-full"
          />
        </div>
      )}

      {pending && (
        <div className="flex items-center justify-between gap-2 rounded border border-vermilion-400/40 bg-vermilion-500/10 px-3 py-1.5 text-[11px] text-vermilion-100">
          <span>{pendingHint(pending)}</span>
          <button
            title="Cancelar colocación"
            aria-label="Cancelar colocación"
            onClick={cancelPending}
            className="rounded border border-line bg-void-soft/85 px-2 py-0.5 text-graphite transition hover:text-vermilion-200 focusable"
          >
            Cancelar
          </button>
        </div>
      )}

      {error && (
        <p className="rounded border border-vermilion-400/40 bg-vermilion-500/10 px-3 py-1.5 text-[11px] text-vermilion-200">
          {error}
        </p>
      )}
    </div>
  );
}
