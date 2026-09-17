// Render smoke + engine-integration tests for the Ternary lab UI.
//
// Uses react-dom/server (renderToString) — no jsdom / testing-library dependency
// — to render each component to static HTML and assert the engine-derived
// content appears. This proves the lab renders without crashing and is wired to
// the already-tested engine, WITHOUT needing the access gate deployed or a live
// Supabase session (the gate lives in the server page, not these components).
//
// Note: renderToString captures each component's INITIAL state. Radix portals
// (Select dropdown items) render out-of-tree and are intentionally not asserted;
// we assert on the engine-derived markup (trit cells, truth tables, results).
import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import { GATE_DOC } from "@/lib/ternary";
import { Converter } from "./converter";
import { GateExplorer } from "./gate-explorer";
import { ArithmeticTrace } from "./arithmetic-trace";
import { TernaryLab } from "./ternary-lab";
import { TritRow } from "./trit-cell";

describe("Ternary lab renders and integrates the engine", () => {
  it("TritRow renders a balanced vector MSB-first with place captions", () => {
    // 5 balanced = [-1,-1,1] little-endian -> +1 (3^2), -1, -1
    const html = renderToString(<TritRow trits={[-1, -1, 1]} system="balanced" />);
    expect(html).toContain("+1");
    expect(html).toContain("-1");
    // place captions render as `3^{i}` (React inserts a comment node between the
    // literal and the expression in SSR, so match tolerantly).
    expect(html).toMatch(/3\^(<!-- -->)?2/);
  });

  it("Converter round-trips balanced 5 (decode(encode(n)) === n)", () => {
    const html = renderToString(<Converter system="balanced" />);
    expect(html).toContain("decode(encode(");
    expect(html).toContain("✓"); // matched
    expect(html).not.toContain("✗"); // never mismatched on a valid value
  });

  it("Converter renders the unbalanced view for a representable value", () => {
    const html = renderToString(<Converter system="unbalanced" />);
    expect(html).toContain("unbalanced");
    expect(html).toContain("✓");
  });

  it("GateExplorer renders AND's definition and the standard badge", () => {
    const html = renderToString(<GateExplorer system="balanced" />);
    expect(html).toContain(GATE_DOC.AND); // "min(a,b)"
    expect(html).toContain("standard");
  });

  it("ArithmeticTrace computes 5 + -3 = 2 with a per-digit trace", () => {
    const html = renderToString(<ArithmeticTrace />);
    expect(html).toContain("carryIn");
    expect(html).toContain("carryOut");
    expect(html).toMatch(/3\^(<!-- -->)?0/); // per-digit place captions
    expect(html).toContain(">2</span>"); // 5 + -3 = 2 (result value rendered)
    expect(html).toContain("✓"); // sum matched the decimal oracle
  });

  it("TernaryLab mounts with the three tabs", () => {
    const html = renderToString(<TernaryLab />);
    expect(html).toContain("Ternary Beta");
    expect(html).toContain("Converter");
    expect(html).toContain("Gates");
    expect(html).toContain("Arithmetic");
  });

  it("engine data drives the AXIOM-defined badge branch", () => {
    expect(GATE_DOC.XOR).toContain("AXIOM-defined");
    expect(GATE_DOC.XNOR).toContain("AXIOM-defined");
    expect(GATE_DOC.AND).not.toContain("AXIOM-defined");
  });
});
