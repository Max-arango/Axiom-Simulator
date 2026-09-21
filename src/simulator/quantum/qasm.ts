// OpenQASM 2.0 export/import for the Quantum Lab (IBM Composer's code view).
// toQasm is pure emit over an already-valid Circuit; fromQasm is the UNTRUSTED
// entry point — it parses a lenient subset by hand, evaluates angle expressions
// with a tiny safe recursive-descent evaluator (NO eval), then runs validate()
// and throws its joined messages. Little-endian, target-LAST convention (see
// types.ts) maps 1:1 onto qelib1 controlled-gate argument order.

import { GATES } from "./gates.ts";
import { validate } from "./circuit.ts";
import type { Circuit, GateId, GateParams, Operation } from "./types.ts";

// GateId → qelib1 (+extended) name. Params ride along per GATES[id].params order.
const QASM_NAME: Record<GateId, string> = {
  I: "id", X: "x", Y: "y", Z: "z", H: "h", S: "s", Sdg: "sdg", T: "t", Tdg: "tdg",
  SX: "sx", SXdg: "sxdg",
  RX: "rx", RY: "ry", RZ: "rz", PHASE: "p", U3: "u3",
  CX: "cx", CZ: "cz", CCX: "ccx", CP: "cp", CRX: "crx", CRY: "cry", CRZ: "crz",
  SWAP: "swap", ISWAP: "iswap", RXX: "rxx", RYY: "ryy", RZZ: "rzz",
  BARRIER: "barrier", RESET: "reset", M: "measure",
};

// Reverse map for import. `measure` is handled specially (arrow syntax).
const FROM_NAME: Record<string, GateId> = {
  id: "I", x: "X", y: "Y", z: "Z", h: "H", s: "S", sdg: "Sdg", t: "T", tdg: "Tdg",
  sx: "SX", sxdg: "SXdg",
  rx: "RX", ry: "RY", rz: "RZ", p: "PHASE", u3: "U3",
  cx: "CX", cz: "CZ", ccx: "CCX", cp: "CP", crx: "CRX", cry: "CRY", crz: "CRZ",
  swap: "SWAP", iswap: "ISWAP", rxx: "RXX", ryy: "RYY", rzz: "RZZ",
  barrier: "BARRIER", reset: "RESET",
};

// Gates whose names are NOT in base qelib1.inc; presence triggers a heads-up comment.
const EXTENDED: ReadonlySet<GateId> = new Set([
  "SX", "SXdg", "ISWAP", "RXX", "RYY", "RZZ", "CRX", "CRY", "CRZ", "CP",
]);

// Full JS precision so round-trips are exact; still a "plain number" (e.g. 1.5707963267948966).
const fmt = (x: number): string => String(x);

function gateLine(op: Operation): string {
  if (op.gate === "M") {
    const a = op.qubits[0];
    return `measure q[${a}] -> c[${op.clbit ?? a}];`;
  }
  if (op.gate === "RESET") return `reset q[${op.qubits[0]}];`;
  const spec = GATES[op.gate];
  const name = QASM_NAME[op.gate];
  const args = spec.params.map((p) => fmt(op.params?.[p] ?? 0));
  const argStr = args.length ? `(${args.join(",")})` : "";
  const qubitStr = op.qubits.map((q) => `q[${q}]`).join(",");
  return `${name}${argStr} ${qubitStr};`;
}

function emitOp(op: Operation): string[] {
  // classical conditional → OpenQASM `if (c==K)` (K = value shifted to its bit).
  const cond = op.condition ? `if (c==${op.condition.value << op.condition.clbit}) ` : "";
  const oc = op.openControls ?? [];
  if (oc.length === 0) return [cond + gateLine(op)];
  // qelib1 has no open (|0⟩) controls: conjugate each anti-control by X.
  const out: string[] = [];
  for (const q of oc) out.push(`// (open control on q[${q}])`);
  for (const q of oc) out.push(`x q[${q}];`);
  out.push(cond + gateLine(op));
  for (const q of oc) out.push(`x q[${q}];`);
  return out;
}

export function toQasm(circuit: Circuit): string {
  const lines: string[] = [];
  if (circuit.ops.some((o) => EXTENDED.has(o.gate))) {
    lines.push("// Uses extended gate names (sx, iswap, rxx, ...) beyond base qelib1.");
  }
  lines.push("OPENQASM 2.0;");
  lines.push('include "qelib1.inc";');
  lines.push(`qreg q[${circuit.qubits}];`);
  lines.push(`creg c[${circuit.qubits}];`);
  for (const op of circuit.ops) lines.push(...emitOp(op));
  return lines.join("\n") + "\n";
}

// --- angle expression evaluator: +−*/, parentheses, `pi`, numbers. No eval. ---

function tokenize(expr: string): string[] {
  const tokens: string[] = [];
  let s = expr.trim();
  const re = /^([0-9]*\.?[0-9]+(?:[eE][+-]?[0-9]+)?|pi|[-+*/()])/;
  while (s.length) {
    const m = re.exec(s);
    if (!m) throw new Error(`Ángulo QASM inválido: "${expr}"`);
    tokens.push(m[1]);
    s = s.slice(m[0].length).trimStart();
  }
  return tokens;
}

function evalAngle(expr: string): number {
  const tokens = tokenize(expr);
  let pos = 0;
  const peek = (): string => tokens[pos];

  const parseExpr = (): number => {
    let v = parseTerm();
    while (peek() === "+" || peek() === "-") {
      const op = tokens[pos++];
      v = op === "+" ? v + parseTerm() : v - parseTerm();
    }
    return v;
  };
  const parseTerm = (): number => {
    let v = parseFactor();
    while (peek() === "*" || peek() === "/") {
      const op = tokens[pos++];
      v = op === "*" ? v * parseFactor() : v / parseFactor();
    }
    return v;
  };
  const parseFactor = (): number => {
    if (pos >= tokens.length) throw new Error(`Ángulo QASM inválido: "${expr}"`);
    const t = tokens[pos++];
    if (t === "+") return parseFactor();
    if (t === "-") return -parseFactor();
    if (t === "(") {
      const v = parseExpr();
      if (tokens[pos++] !== ")") throw new Error(`Ángulo QASM inválido: "${expr}"`);
      return v;
    }
    if (t === "pi") return Math.PI;
    const num = Number(t);
    if (!Number.isFinite(num)) throw new Error(`Ángulo QASM inválido: "${expr}"`);
    return num;
  };

  const result = parseExpr();
  if (pos !== tokens.length) throw new Error(`Ángulo QASM inválido: "${expr}"`);
  return result;
}

function parseQubits(list: string): number[] {
  return list.split(",").map((tok) => {
    const m = /^q\[(\d+)\]$/.exec(tok.trim());
    if (!m) throw new Error(`Argumento de qubit QASM inválido: "${tok.trim()}"`);
    return Number(m[1]);
  });
}

export function fromQasm(src: string): Circuit {
  let n: number | undefined;
  const ops: Operation[] = [];

  for (const raw of src.split("\n")) {
    let line = raw;
    const ci = line.indexOf("//");
    if (ci >= 0) line = line.slice(0, ci); // strip line/inline comment
    line = line.trim();
    if (!line) continue;
    if (/^(OPENQASM|include|creg|gate)\b/i.test(line)) continue; // ignored preamble
    if (line.endsWith(";")) line = line.slice(0, -1).trim();
    if (!line) continue;

    // optional classical conditional prefix: `if (c==K) <gate>` (best-effort:
    // a single set bit K=2^b maps back to clbit b, value 1).
    let condition: { clbit: number; value: 0 | 1 } | undefined;
    const ifm = /^if\s*\(\s*c\s*==\s*(\d+)\s*\)\s*(.+)$/i.exec(line);
    if (ifm) {
      const K = Number(ifm[1]);
      if (K > 0 && (K & (K - 1)) === 0) condition = { clbit: Math.log2(K), value: 1 };
      line = ifm[2].trim();
    }

    const qreg = /^qreg\s+[A-Za-z_]\w*\s*\[(\d+)\]$/i.exec(line);
    if (qreg) {
      if (n === undefined) n = Number(qreg[1]);
      continue;
    }

    const meas = /^measure\s+q\[(\d+)\]\s*->\s*c\[(\d+)\]$/i.exec(line);
    if (meas) {
      ops.push({ gate: "M", qubits: [Number(meas[1])], clbit: Number(meas[2]) });
      continue;
    }

    const g = /^([A-Za-z][A-Za-z0-9]*)\s*(?:\(([^)]*)\))?\s+(.+)$/.exec(line);
    if (!g) throw new Error(`Línea QASM no reconocida: "${line}"`);
    const name = g[1].toLowerCase();
    const gid = FROM_NAME[name];
    if (!gid) throw new Error(`Puerta QASM no soportada: ${name}`);

    const op: Operation = { gate: gid, qubits: parseQubits(g[3]) };
    if (condition) op.condition = condition;
    const spec = GATES[gid];
    if (spec.params.length) {
      const args = (g[2] ?? "").split(",").map((a) => a.trim()).filter((a) => a.length);
      const params: GateParams = {};
      spec.params.forEach((pname, i) => {
        if (i < args.length) params[pname] = evalAngle(args[i]);
      });
      op.params = params;
    }
    ops.push(op);
  }

  if (n === undefined) {
    throw new Error("QASM inválido: falta la declaración 'qreg q[N];'.");
  }

  const circuit: Circuit = { qubits: n, ops };
  const { ok, errors } = validate(circuit);
  if (!ok) throw new Error(errors.join(" "));
  return circuit;
}
