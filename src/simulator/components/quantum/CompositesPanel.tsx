// Composite-gate (subcircuit) library: save the current circuit as a reusable
// block and stamp any block onto the circuit starting at a chosen qubit. Inserting
// expands the block into primitive gates (the engine never sees composites).
import { useState } from "react";
import { useQuantum } from "../../quantum/quantumStore.ts";

export function CompositesPanel() {
  const composites = useQuantum((s) => s.composites);
  const numQubits = useQuantum((s) => s.numQubits);
  const saveComposite = useQuantum((s) => s.saveComposite);
  const insertComposite = useQuantum((s) => s.insertComposite);
  const deleteComposite = useQuantum((s) => s.deleteComposite);
  const [name, setName] = useState("");
  const [base, setBase] = useState<Record<string, number>>({});

  return (
    <div className="flex flex-col gap-2 font-mono text-[11px] text-ink">
      <div className="flex gap-1.5">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre de la compuerta"
          aria-label="Nombre de la compuerta compuesta"
          className="focusable min-w-0 flex-1 rounded border border-line bg-black/40 px-2 py-1 text-ink"
        />
        <button
          onClick={() => {
            saveComposite(name);
            setName("");
          }}
          className="focusable shrink-0 rounded border border-line px-2 py-1 text-vermilion-300 transition hover:border-vermilion-400/50 hover:bg-vermilion-500/10"
          title="Guardar el circuito actual como compuerta"
          aria-label="Guardar circuito como compuerta"
        >
          Guardar
        </button>
      </div>

      <div className="flex flex-col gap-1.5">
        {composites.map((c) => {
          const maxBase = Math.max(0, numQubits - c.qubits);
          const b = Math.min(base[c.id] ?? 0, maxBase);
          const fits = c.qubits <= numQubits;
          return (
            <div key={c.id} className="flex items-center gap-2 rounded border border-line bg-void-soft/50 px-2 py-1.5">
              <div className="min-w-0 flex-1">
                <div className="truncate text-ink">{c.name}</div>
                <div className="text-[10px] text-graphite">{c.qubits} qubits{c.builtin ? " · integrada" : ""}</div>
              </div>
              <label className="flex items-center gap-1 text-[10px] text-graphite" title="Qubit inicial">
                q
                <select
                  value={b}
                  disabled={!fits}
                  onChange={(e) => setBase((m) => ({ ...m, [c.id]: Number(e.target.value) }))}
                  aria-label={`Qubit inicial para ${c.name}`}
                  className="focusable rounded border border-line bg-black/40 px-1 py-0.5 text-ink"
                >
                  {Array.from({ length: maxBase + 1 }, (_, i) => (
                    <option key={i} value={i}>{i}</option>
                  ))}
                </select>
              </label>
              <button
                onClick={() => insertComposite(c.id, b)}
                disabled={!fits}
                className="focusable shrink-0 rounded border border-line px-2 py-0.5 text-vermilion-300 transition hover:border-vermilion-400/50 hover:bg-vermilion-500/10 disabled:opacity-40"
                title={fits ? `Insertar ${c.name} en q${b}` : "No caben suficientes qubits"}
                aria-label={`Insertar ${c.name}`}
              >
                Insertar
              </button>
              {!c.builtin && (
                <button
                  onClick={() => deleteComposite(c.id)}
                  className="focusable shrink-0 rounded px-1 text-graphite transition hover:text-vermilion-300"
                  title={`Eliminar ${c.name}`}
                  aria-label={`Eliminar ${c.name}`}
                >
                  ✕
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
