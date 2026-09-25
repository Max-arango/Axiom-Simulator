import { useState } from "react";
import { useLifeStore, getEngine } from "../../life/store.ts";
import { serialize, deserialize, buildShareURL } from "../../life/snapshot.ts";
import { downloadText } from "../quantum/downloads.ts";

const STORAGE_KEY = "axiom.life.boards";

function readLib(): Record<string, string> {
  if (typeof localStorage === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as Record<string, string>;
  } catch {
    return {};
  }
}
function writeLib(lib: Record<string, string>): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lib));
  } catch { /* quota exceeded */ }
}

const btn = "focusable rounded border border-line px-2.5 py-1 text-[11px] text-vermilion-300 transition hover:border-vermilion-400/50 hover:bg-vermilion-500/10";

type CopyState = "idle" | "json" | "url";

export function LifeSharePanel() {
  const { generation, loadSnapshot } = useLifeStore();
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const [saveName, setSaveName] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [libVersion, setLibVersion] = useState(0);
  const [copied, setCopied] = useState<CopyState>("idle");

  // Build JSON on each render so it reflects current board state.
  const json = serialize(getEngine(), generation);

  const copyWith = (state: CopyState, text: string) => {
    if (!navigator?.clipboard) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(state);
      setTimeout(() => setCopied("idle"), 1600);
    }).catch(() => {});
  };

  const load = (src: string) => {
    try {
      loadSnapshot(deserialize(src));
      setImportError(null);
      setImportText("");
    } catch (e) {
      setImportError((e as Error).message);
    }
  };

  const saveToLib = () => {
    const n = saveName.trim();
    if (!n) { setSaveError("Escribe un nombre."); return; }
    writeLib({ ...readLib(), [n]: json });
    setSaveName("");
    setSaveError(null);
    setLibVersion((v) => v + 1);
  };

  const delFromLib = (n: string) => {
    const next = readLib();
    delete next[n];
    writeLib(next);
    setLibVersion((v) => v + 1);
  };

  void libVersion;
  const lib = readLib();
  const names = Object.keys(lib).sort();

  return (
    <div className="space-y-4 text-xs">

      {/* Export */}
      <div className="space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-graphite">Exportar</p>
        <div className="flex flex-wrap gap-1.5">
          <button
            className={btn}
            onClick={() => copyWith("json", json)}
            title="Copiar JSON al portapapeles"
          >
            {copied === "json" ? "Copiado ✓" : "Copiar JSON"}
          </button>
          <button
            className={btn}
            onClick={() => downloadText("life-board.json", json, "application/json")}
            title="Descargar como archivo .json"
          >
            Descargar .json
          </button>
          <button
            className={btn}
            onClick={() => copyWith("url", buildShareURL(json))}
            title="Copiar URL para compartir"
          >
            {copied === "url" ? "URL copiada ✓" : "Copiar URL"}
          </button>
        </div>
        <textarea
          readOnly
          value={json}
          rows={4}
          className="w-full resize-none rounded border border-line bg-black/40 p-2 font-mono text-[11px] text-ink outline-none scroll-thin focus:ring-1 focus:ring-vermilion-400"
          aria-label="JSON del tablero"
        />
        <p className="text-[10px] text-graphite">
          La URL incluye el tablero completo en el hash — compártela directamente.
        </p>
      </div>

      {/* Import */}
      <div className="space-y-2 border-t border-line pt-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-graphite">Importar</p>
        <textarea
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          placeholder="Pega aquí el JSON de un tablero…"
          rows={4}
          className="w-full resize-none rounded border border-line bg-black/40 p-2 font-mono text-[11px] text-ink outline-none scroll-thin placeholder:text-graphite/60 focus:ring-1 focus:ring-vermilion-400"
          aria-label="JSON a importar"
        />
        <div className="flex items-center gap-3">
          <button
            className={btn}
            onClick={() => load(importText)}
            title="Cargar tablero desde el JSON pegado"
          >
            Cargar
          </button>
          {importError && <span className="text-vermilion-300">{importError}</span>}
        </div>
      </div>

      {/* Library */}
      <div className="space-y-2 border-t border-line pt-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-graphite">Guardados</p>
        <div className="flex gap-1.5">
          <input
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") saveToLib(); }}
            placeholder="Nombre del tablero"
            className="focusable min-w-0 flex-1 rounded border border-line bg-black/40 px-2 py-1 font-mono text-[11px] text-ink outline-none"
            aria-label="Nombre del tablero a guardar"
          />
          <button className={btn} onClick={saveToLib}>Guardar</button>
        </div>
        {saveError && <p className="text-vermilion-300">{saveError}</p>}
        {names.length === 0 ? (
          <p className="text-graphite">Sin tableros guardados.</p>
        ) : (
          <div className="space-y-1">
            {names.map((n) => (
              <div key={n} className="flex items-center gap-2 rounded border border-line bg-void-soft/50 px-2 py-1 font-mono text-[11px]">
                <span className="min-w-0 flex-1 truncate text-ink">{n}</span>
                <button
                  className="focusable shrink-0 rounded border border-line px-2 py-0.5 text-vermilion-300 transition hover:border-vermilion-400/50"
                  onClick={() => load(lib[n])}
                  title={`Cargar ${n}`}
                >
                  Cargar
                </button>
                <button
                  className="focusable shrink-0 rounded px-1 text-graphite transition hover:text-vermilion-300"
                  onClick={() => delFromLib(n)}
                  title={`Eliminar ${n}`}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
