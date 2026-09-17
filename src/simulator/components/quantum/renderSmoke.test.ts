// Render smoke test: server-render the whole Quantum Lab tree + each panel,
// proving nothing throws during render (catches runtime errors tsc/unit tests
// miss). Effects (WebGL, intervals) don't run here — by design; this guards the
// render path. NOTE: zustand hooks return the creation-time snapshot under
// renderToStaticMarkup, so panels render the INITIAL store state here; live
// content is a browser concern. .test.ts (matches vitest include) → createElement.
import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { useQuantum } from "../../quantum/quantumStore.ts";
import { getAlgorithm } from "../../quantum/algorithms.ts";

import { QuantumLabView } from "./QuantumLabView.tsx";
import { StatePanel } from "./StatePanel.tsx";
import { MeasurementPanel } from "./MeasurementPanel.tsx";
import { BlochPanel } from "./BlochPanel.tsx";
import { EntanglementPanel } from "./EntanglementPanel.tsx";
import { GateInspector } from "./GateInspector.tsx";
import { LearnPanel } from "./LearnPanel.tsx";
import { GatePalette } from "./GatePalette.tsx";
import { CircuitGrid } from "./CircuitGrid.tsx";

describe("Quantum Lab render smoke", () => {
  it("renders the full view without throwing", () => {
    const html = renderToStaticMarkup(createElement(QuantumLabView));
    expect(html.length).toBeGreaterThan(200);
    expect(html).toContain("Statevector"); // default tab present
    expect(html).toContain("Compuertas"); // left rail section
  });

  it("renders each panel without throwing, with a Bell circuit + shots loaded in the store", () => {
    // Exercises loadCircuit/gotoEnd/runShots/selectPlacement store logic in node
    // (render reads the SSR initial snapshot, but the actions must not throw).
    const bell = getAlgorithm("bell")!;
    useQuantum.getState().loadCircuit(bell.circuit);
    useQuantum.getState().gotoEnd();
    useQuantum.getState().runShots();
    const first = useQuantum.getState().placements[0];
    if (first) useQuantum.getState().selectPlacement(first.id);
    for (const C of [StatePanel, MeasurementPanel, BlochPanel, EntanglementPanel, GateInspector, LearnPanel, GatePalette, CircuitGrid]) {
      const html = renderToStaticMarkup(createElement(C));
      expect(html.length).toBeGreaterThan(0);
    }
  });

  it("StatePanel binds to the statevector (initial |000⟩ at 100%)", () => {
    const html = renderToStaticMarkup(createElement(StatePanel));
    expect(html).toContain("|000⟩");
    expect(html).toContain("100.0%");
  });
});
