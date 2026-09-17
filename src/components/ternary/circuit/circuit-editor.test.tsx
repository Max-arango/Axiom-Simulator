// Render smoke + engine-integration tests for the circuit editor.
//
// Mirrors ../render.test.tsx: renderToString (no jsdom / testing-library) proves
// the editor mounts, and we assert the ENGINE result for the seed circuit to
// prove the seed is valid and correct. Interactivity (Step/Run clicks) isn't
// reachable via renderToString, so we exercise the engine directly instead.
import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import { simulate, validate } from "@/lib/ternary";
import { CircuitEditor, halfAdderSeed } from "./circuit-editor";

describe("Circuit editor renders and integrates the engine", () => {
  it("renders the seeded half-adder editor without throwing", () => {
    const html = renderToString(<CircuitEditor system="balanced" />);
    // input labels, gate names, and controls appear
    expect(html).toContain("A");
    expect(html).toContain("B");
    expect(html).toContain("SUM");
    expect(html).toContain("CARRY");
    expect(html).toContain("Run");
    expect(html).toContain("Step");
  });

  it("seed circuit is valid and simulates a correct half-adder (1+1)", () => {
    const seed = halfAdderSeed("balanced");
    expect(validate(seed).ok).toBe(true);

    const { values } = simulate(seed);
    const sumNode = seed.nodes.find((n) => n.gate === "SUM")!;
    const carryNode = seed.nodes.find((n) => n.gate === "CARRY")!;
    // A=1, B=1 → SUM digit -1, CARRY +1  (decimal 2 = balanced [-1,+1])
    expect(values[sumNode.id]).toBe(-1);
    expect(values[carryNode.id]).toBe(1);
  });

  it("seed values are shown on first paint (SSR contains the computed trits)", () => {
    const html = renderToString(<CircuitEditor system="balanced" />);
    expect(html).toContain("-1"); // SUM cell
    expect(html).toContain("+1"); // CARRY cell (balanced +1 label)
  });

  it("seed is also structurally valid under the unbalanced system", () => {
    expect(validate(halfAdderSeed("unbalanced")).ok).toBe(true);
  });
});
