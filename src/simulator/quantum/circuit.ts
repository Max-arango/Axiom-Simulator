// Circuit model: construction, validation, JSON import/export, text rendering.
// fromExport/deserialize are the untrusted-input trust boundary — they never
// assume the input's shape and throw readable errors. Everything else operates
// on already-validated internal Circuit values.

import { GATES } from "./gates.ts";
import {
  MAX_QUBITS,
  type Circuit,
  type GateId,
  type GateParams,
  type Operation,
} from "./types.ts";

/** A circuit with n qubits and no operations. */
export function emptyCircuit(qubits: number): Circuit {
  return { qubits, ops: [] };
}

// --- friendly per-gate error phrasing (fallbacks cover any future gate) ---

const ARITY_MSG: Partial<Record<GateId, string>> = {
  CX: "CX requires 2 qubits (control, target).",
  CZ: "CZ requires 2 qubits (control, target).",
  CCX: "CCX requires 3 qubits (control, control, target).",
};

const DISTINCT_MSG: Partial<Record<GateId, string>> = {
  CX: "CNOT requires two different qubits.",
  CZ: "CZ requires two different qubits.",
  SWAP: "SWAP requires two different qubits.",
  CCX: "Toffoli requires three different qubits.",
};

function arityMessage(id: GateId, arity: number): string {
  return ARITY_MSG[id] ?? `${id} requires ${arity} qubit${arity === 1 ? "" : "s"}.`;
}

function distinctMessage(id: GateId): string {
  return DISTINCT_MSG[id] ?? `${id} requires distinct qubits.`;
}

function paramMessage(id: GateId, param: "theta" | "phi"): string {
  return `${id} requires a ${param === "theta" ? "θ" : "φ"} parameter.`;
}

/**
 * Human-readable structural validation. Collects ALL problems (never stops at
 * the first) so a user fixing a circuit sees everything wrong at once.
 */
export function validate(circuit: Circuit): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  const n = circuit.qubits;
  const validN = Number.isInteger(n) && n >= 1 && n <= MAX_QUBITS;
  if (!validN) errors.push("Circuit must have 1–6 qubits.");

  const ops = Array.isArray(circuit.ops) ? circuit.ops : [];
  for (const op of ops) {
    const spec = GATES[op.gate];
    if (!spec) {
      errors.push(`Unknown gate: "${op.gate}".`);
      continue;
    }
    if (!Array.isArray(op.qubits) || op.qubits.length !== spec.arity) {
      errors.push(arityMessage(op.gate, spec.arity));
      continue; // qubit-level checks are meaningless without the right count
    }
    for (const q of op.qubits) {
      if (!Number.isInteger(q) || q < 0 || (validN && q >= n)) {
        errors.push(`Gate references qubit ${q} which does not exist.`);
      }
    }
    if (spec.arity > 1 && new Set(op.qubits).size !== op.qubits.length) {
      errors.push(distinctMessage(op.gate));
    }
    for (const param of spec.params) {
      const v = op.params?.[param];
      if (typeof v !== "number" || !Number.isFinite(v)) {
        errors.push(paramMessage(op.gate, param));
      }
    }
  }
  return { ok: errors.length === 0, errors };
}

// --- JSON export format (spec §18): field names `operations` + gate/qubits/params ---

export interface CircuitExport {
  qubits: number;
  operations: { gate: GateId; qubits: number[]; params?: GateParams }[];
}

export function toExport(circuit: Circuit): CircuitExport {
  return {
    qubits: circuit.qubits,
    operations: circuit.ops.map((o) => {
      const e: { gate: GateId; qubits: number[]; params?: GateParams } = {
        gate: o.gate,
        qubits: [...o.qubits],
      };
      if (o.params) e.params = { ...o.params };
      return e;
    }),
  };
}

/**
 * Parse an UNTRUSTED object into a Circuit. Verifies shape by hand (nothing is
 * assumed), maps to the internal representation, then runs validate(). Throws an
 * Error with joined messages on any malformation or validation failure.
 */
export function fromExport(obj: unknown): Circuit {
  if (typeof obj !== "object" || obj === null) {
    throw new Error("Invalid circuit: expected an object.");
  }
  const rec = obj as Record<string, unknown>;
  if (typeof rec.qubits !== "number") {
    throw new Error('Invalid circuit: "qubits" must be a number.');
  }
  if (!Array.isArray(rec.operations)) {
    throw new Error('Invalid circuit: "operations" must be an array.');
  }

  const ops: Operation[] = rec.operations.map((raw, i) => {
    if (typeof raw !== "object" || raw === null) {
      throw new Error(`Invalid operation at index ${i}: expected an object.`);
    }
    const r = raw as Record<string, unknown>;
    if (typeof r.gate !== "string") {
      throw new Error(`Invalid operation at index ${i}: "gate" must be a string.`);
    }
    if (!Array.isArray(r.qubits) || !r.qubits.every((q) => typeof q === "number")) {
      throw new Error(`Invalid operation at index ${i}: "qubits" must be an array of numbers.`);
    }
    const op: Operation = { gate: r.gate as GateId, qubits: r.qubits as number[] };
    if (r.params !== undefined) {
      if (typeof r.params !== "object" || r.params === null) {
        throw new Error(`Invalid operation at index ${i}: "params" must be an object.`);
      }
      op.params = r.params as GateParams;
    }
    return op;
  });

  const circuit: Circuit = { qubits: rec.qubits, ops };
  const { ok, errors } = validate(circuit);
  if (!ok) throw new Error(errors.join(" "));
  return circuit;
}

export function serialize(circuit: Circuit): string {
  return JSON.stringify(toExport(circuit), null, 2);
}

export function deserialize(json: string): Circuit {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (e) {
    throw new Error(`Invalid JSON: ${(e as Error).message}`);
  }
  return fromExport(parsed);
}

/**
 * Legible multi-line rendering, one line per qubit in operation order. Not true
 * wire ASCII art — just readable and non-throwing on any (even invalid) circuit.
 */
export function toText(circuit: Circuit): string {
  const n = Number.isInteger(circuit.qubits) && circuit.qubits > 0 ? circuit.qubits : 0;
  const ops = Array.isArray(circuit.ops) ? circuit.ops : [];
  const lines: string[] = [];
  for (let q = 0; q < n; q++) {
    const labels: string[] = [];
    for (const o of ops) {
      if (!Array.isArray(o.qubits) || !o.qubits.includes(q)) continue;
      const spec = GATES[o.gate];
      const base = spec ? spec.label : String(o.gate);
      if (spec && spec.kind === "controlled") {
        const target = o.qubits[o.qubits.length - 1];
        labels.push(q === target ? base : `${base}·ctrl`);
      } else {
        labels.push(base);
      }
    }
    lines.push(`q${q}: ${labels.length ? labels.join(" — ") : "—"}`);
  }
  return lines.join("\n");
}
