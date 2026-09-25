import { GameOfLifeEngine } from "./engine.ts";

export interface LifeSnapshot {
  v: 1;
  name?: string;
  w: number;
  h: number;
  gen: number;
  cells: number[]; // flat indices: row * w + col
}

/** Alive cells → compact JSON snapshot. */
export function serialize(engine: GameOfLifeEngine, gen: number, name?: string): string {
  const { width: w, height: h, cells } = engine;
  const alive: number[] = [];
  for (let i = 0; i < cells.length; i++) {
    if (cells[i]) alive.push(i);
  }
  const snap: LifeSnapshot = { v: 1, w, h, gen, cells: alive };
  if (name) snap.name = name;
  return JSON.stringify(snap);
}

/** Parse and validate. Throws descriptive Error on bad input. */
export function deserialize(json: string): LifeSnapshot {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    throw new Error("JSON inválido.");
  }
  if (typeof raw !== "object" || raw === null) throw new Error("Formato inválido: no es objeto.");
  const s = raw as Record<string, unknown>;
  if (s.v !== 1) throw new Error("Versión no soportada (se esperaba v:1).");
  if (typeof s.w !== "number" || typeof s.h !== "number" || s.w < 1 || s.h < 1)
    throw new Error("Dimensiones inválidas.");
  if (!Array.isArray(s.cells)) throw new Error("Falta el campo 'cells'.");
  const total = (s.w as number) * (s.h as number);
  for (const c of s.cells as unknown[]) {
    if (typeof c !== "number" || c < 0 || c >= total || !Number.isInteger(c))
      throw new Error(`Índice de celda fuera de rango: ${c}`);
  }
  return {
    v: 1,
    name: typeof s.name === "string" ? s.name : undefined,
    w: s.w as number,
    h: s.h as number,
    gen: typeof s.gen === "number" ? (s.gen as number) : 0,
    cells: s.cells as number[],
  };
}

/** Encode snapshot to a URL-safe base64 string (for hash sharing). */
export function encodeURL(json: string): string {
  return btoa(encodeURIComponent(json));
}

/** Decode a URL-safe base64 string back to JSON. Throws on malformed input. */
export function decodeURL(encoded: string): string {
  try {
    return decodeURIComponent(atob(encoded));
  } catch {
    throw new Error("Hash de URL inválido.");
  }
}

export const HASH_PREFIX = "life=";

/** Read a snapshot from the current URL hash, or null if absent/invalid. */
export function readHashSnapshot(): LifeSnapshot | null {
  if (typeof window === "undefined") return null;
  const hash = window.location.hash.slice(1); // drop '#'
  if (!hash.startsWith(HASH_PREFIX)) return null;
  try {
    return deserialize(decodeURL(hash.slice(HASH_PREFIX.length)));
  } catch {
    return null;
  }
}

/** Build a shareable URL for the current snapshot. */
export function buildShareURL(json: string): string {
  const base = `${window.location.origin}${window.location.pathname}`;
  return `${base}#${HASH_PREFIX}${encodeURL(json)}`;
}
