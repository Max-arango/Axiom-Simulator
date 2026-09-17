import { describe, it, expect } from "vitest";
import { GATES } from "./gates.ts";
import { GATE_DOCS, getGateDoc } from "./gateDocs.ts";
import type { GateId } from "./types.ts";

const PARAMETRIC: GateId[] = ["RX", "RY", "RZ", "PHASE"];

describe("gateDocs — coverage", () => {
  it("has a doc with non-empty name and summary for every GateId", () => {
    for (const id of Object.keys(GATES) as GateId[]) {
      const doc = GATE_DOCS[id];
      expect(doc, `missing doc for ${id}`).toBeDefined();
      expect(doc.id).toBe(id);
      expect(doc.name.length).toBeGreaterThan(0);
      expect(doc.summary.length).toBeGreaterThan(0);
    }
  });

  it("has no extra docs beyond the GateId set", () => {
    expect(Object.keys(GATE_DOCS).sort()).toEqual(Object.keys(GATES).sort());
  });
});

describe("gateDocs — parametric flag", () => {
  it("parametric gates are flagged true, all others falsy", () => {
    for (const id of Object.keys(GATES) as GateId[]) {
      if (PARAMETRIC.includes(id)) {
        expect(GATE_DOCS[id].parametric, `${id} should be parametric`).toBe(true);
      } else {
        expect(GATE_DOCS[id].parametric, `${id} should not be parametric`).toBeFalsy();
      }
    }
  });
});

describe("gateDocs — spot checks", () => {
  it("Hadamard has the standard name and a non-empty matrix", () => {
    expect(getGateDoc("H").name).toBe("Hadamard");
    expect(getGateDoc("H").matrixTex.length).toBeGreaterThan(0);
  });

  it("Measurement is non-parametric, has empty matrix and mentions measurement", () => {
    const m = getGateDoc("M");
    expect(m.parametric).toBeFalsy();
    expect(m.matrixTex).toBe("");
    expect(m.summary.toLowerCase()).toMatch(/medici[oó]n|measurement/);
  });
});
