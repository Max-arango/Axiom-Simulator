// localStorage-backed named-circuit library. SSR-safe: with no localStorage it
// renders an empty library and the save no-ops.
import { useState } from "react";
import { useQuantum, toCircuit } from "../../quantum/quantumStore.ts";
import { serialize, deserialize } from "../../quantum/circuit.ts";

const KEY = "axiom.quantum.circuits";

function readLib(): Record<string, string> {
  if (typeof localStorage === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}") as Record<string, string>;
  } catch {
    return {};
  }
}
function writeLib(lib: Record<string, string>): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(lib));
  } catch {
    /* quota / disabled — ignore */
  }
}

export function SavedCircuitsPanel() {
  const numQubits = useQuantum((s) => s.numQubits);
  const placements = useQuantum((s) => s.placements);
  const loadCircuit = useQuantum((s) => s.loadCircuit);
  const [name, setName] = useState("");
  const [version, setVersion] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const lib = readLib();
  void version; // re-read after writes

  const save = () => {
    const n = name.trim();
    if (!n) {
      setError("Escribe un nombre.");
      return;
    }
    const next = { ...readLib(), [n]: serialize(toCircuit({ numQubits, placements })) };
    writeLib(next);
    setName("");
    setError(null);
    setVersion((v) => v + 1);
  };
  const load = (json: string) => {
    try {
      loadCircuit(deserialize(json));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cargar.");
    }
  };
  const del = (n: string) => {
    const next = readLib();
    delete next[n];
    writeLib(next);
    setVersion((v) => v + 1);
  };

  const names = Object.keys(lib).sort();

  return (
    <div className="flex flex-col gap-2 font-mono text-[11px] text-ink">
      <div className="flex gap-1.5">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre del circuito"
          aria-label="Nombre del circuito a guardar"
          className="focusable min-w-0 flex-1 rounded border border-line bg-black/40 px-2 py-1 text-ink"
        />
        <button
          onClick={save}
          className="focusable shrink-0 rounded border border-line px-2 py-1 text-vermilion-300 transition hover:border-vermilion-400/50 hover:bg-vermilion-500/10"
          title="Guardar el circuito actual en el navegador"
          aria-label="Guardar circuito"
        >
          Guardar
        </button>
      </div>
      {error && <p className="text-vermilion-300">{error}</p>}
      {names.length === 0 ? (
        <p className="text-graphite">Sin circuitos guardados.</p>
      ) : (
        <div className="flex flex-col gap-1">
          {names.map((n) => (
            <div key={n} className="flex items-center gap-2 rounded border border-line bg-void-soft/50 px-2 py-1">
              <span className="min-w-0 flex-1 truncate">{n}</span>
              <button
                onClick={() => load(lib[n])}
                className="focusable shrink-0 rounded border border-line px-2 py-0.5 text-vermilion-300 transition hover:border-vermilion-400/50"
                title={`Cargar ${n}`}
                aria-label={`Cargar ${n}`}
              >
                Cargar
              </button>
              <button
                onClick={() => del(n)}
                className="focusable shrink-0 rounded px-1 text-graphite transition hover:text-vermilion-300"
                title={`Eliminar ${n}`}
                aria-label={`Eliminar ${n}`}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
