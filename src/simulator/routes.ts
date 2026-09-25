import { useStore, type AppMode } from "./store.ts";

/** URL segment → AppMode (for reading window.location.pathname). */
export const SEGMENT_TO_MODE: Record<string, AppMode> = {
  calculator: "calculator",
  fractal: "fractal",
  bloch: "bloch",
  quantum: "quantum",
  "4d": "fourd",
  topology: "topo",
  dynamics: "dynamics",
  "dynamics-3d": "dynamics3d",
  life: "life",
  inspector: "inspector",
  notebook: "notebook",
  docs: "docs",
};

/** AppMode → URL segment. "home" is absent (maps to base /simulator). */
export const MODE_TO_SEGMENT: Partial<Record<AppMode, string>> = {
  calculator: "calculator",
  fractal: "fractal",
  bloch: "bloch",
  quantum: "quantum",
  fourd: "4d",
  topo: "topology",
  dynamics: "dynamics",
  dynamics3d: "dynamics-3d",
  life: "life",
  inspector: "inspector",
  notebook: "notebook",
  docs: "docs",
};

/**
 * Navigate to a workspace: update Zustand store AND browser URL via pushState
 * so the tab bar and URL stay in sync without a full page reload.
 */
export function navigateTo(mode: AppMode): void {
  useStore.getState().setAppMode(mode);
  if (typeof window === "undefined") return;
  const seg = MODE_TO_SEGMENT[mode];
  window.history.pushState(null, "", seg ? `/simulator/${seg}` : "/simulator");
}
