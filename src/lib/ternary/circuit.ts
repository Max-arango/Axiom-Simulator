// Pure-math ternary CIRCUIT ENGINE — the simulation core for the Phase E
// editor. Zero deps, no React/DB. A circuit is a DAG of nodes wired by edges;
// this module topologically evaluates it into a trit per node.
//
// COMBINATIONAL ONLY (MVP): no feedback loops. A cycle is a validation error.
//
// A gate's output value is always a plain Trit; COMPARE in particular returns a
// balanced trit ({-1,0,+1}) regardless of the circuit's system — values are
// trits and the UI decides how to render them. We only use c.system to pick
// which gate table (balanced vs unbalanced) applies, via gatesFor().

import { GateName, GATE_ARITY, gatesFor } from "./gates";
import { System, Trit } from "./trit";

export type NodeKind = "input" | "gate" | "output";

/** A node. `gate` is required iff kind === "gate". `label` is UI-only. */
export interface CircuitNode {
  id: string;
  kind: NodeKind;
  gate?: GateName;
  label?: string;
}

/** A wire: `from` is a node's single output, `to` the target node, `port` the
 *  target's 0-based input index. */
export interface Edge {
  from: string;
  to: string;
  port: number;
}

export interface Circuit {
  nodes: CircuitNode[];
  edges: Edge[];
  inputs: Record<string, Trit>; // input-node id → its trit (default 0 if unset)
  system: System;
}

// Anti-abuse caps (§33). Simulation is O(nodes + edges); these bound it.
export const MAX_CIRCUIT_NODES = 100;
export const MAX_CIRCUIT_EDGES = 300;

/** Required input count: input=0, output=1, gate=its GATE_ARITY. */
function arityOf(node: CircuitNode): number {
  if (node.kind === "input") return 0;
  if (node.kind === "output") return 1;
  return node.gate ? GATE_ARITY[node.gate] : 0;
}

/** Kahn topological order over known nodes; null if a cycle prevents covering
 *  every (distinct) node id. Edges touching unknown ids are ignored so callers
 *  can run this on a structurally-invalid circuit without it throwing. */
function topoOrder(c: Circuit): string[] | null {
  const ids = new Set(c.nodes.map((n) => n.id));
  const indeg = new Map<string, number>();
  const out = new Map<string, string[]>();
  for (const id of ids) indeg.set(id, 0);
  for (const e of c.edges) {
    if (!ids.has(e.from) || !ids.has(e.to)) continue;
    indeg.set(e.to, (indeg.get(e.to) ?? 0) + 1);
    let lst = out.get(e.from);
    if (!lst) out.set(e.from, (lst = []));
    lst.push(e.to);
  }
  const queue = [...ids].filter((id) => indeg.get(id) === 0);
  const order: string[] = [];
  while (queue.length) {
    const id = queue.shift()!;
    order.push(id);
    for (const t of out.get(id) ?? []) {
      const d = indeg.get(t)! - 1;
      indeg.set(t, d);
      if (d === 0) queue.push(t);
    }
  }
  return order.length === ids.size ? order : null;
}

/** Incoming edges per target node, each list sorted by port ascending. */
function incomingByPort(c: Circuit): Map<string, Edge[]> {
  const m = new Map<string, Edge[]>();
  for (const e of c.edges) {
    let lst = m.get(e.to);
    if (!lst) m.set(e.to, (lst = []));
    lst.push(e);
  }
  for (const lst of m.values()) lst.sort((x, y) => x.port - y.port);
  return m;
}

/** Structural check. Never throws — returns every problem it finds so the UI
 *  can list them. simulate() calls this and throws the joined message. */
export function validate(c: Circuit): { ok: boolean; errors: string[] } {
  const errors: string[] = [];

  if (c.nodes.length > MAX_CIRCUIT_NODES)
    errors.push(`too many nodes: ${c.nodes.length} > ${MAX_CIRCUIT_NODES}`);
  if (c.edges.length > MAX_CIRCUIT_EDGES)
    errors.push(`too many edges: ${c.edges.length} > ${MAX_CIRCUIT_EDGES}`);

  const nodeMap = new Map<string, CircuitNode>();
  let hasDup = false;
  for (const n of c.nodes) {
    if (nodeMap.has(n.id)) {
      errors.push(`duplicate node id "${n.id}"`);
      hasDup = true;
    }
    nodeMap.set(n.id, n);
    if (n.kind === "gate" && !n.gate)
      errors.push(`gate node "${n.id}" has no gate`);
    if (n.kind !== "gate" && n.gate)
      errors.push(`node "${n.id}" is ${n.kind} but carries a gate`);
  }

  // Edge validity: existing endpoints, in-range distinct ports.
  const seen = new Set<string>(); // `${to}#${port}`
  const wired = new Map<string, number>(); // to → count of accepted edges
  for (const e of c.edges) {
    if (!nodeMap.has(e.from)) errors.push(`edge from unknown node "${e.from}"`);
    const to = nodeMap.get(e.to);
    if (!to) {
      errors.push(`edge to unknown node "${e.to}"`);
      continue;
    }
    const need = arityOf(to);
    if (!Number.isInteger(e.port) || e.port < 0 || e.port >= need) {
      errors.push(
        `edge into "${e.to}" has port ${e.port} out of range [0..${need - 1}]`,
      );
      continue;
    }
    const key = `${e.to}#${e.port}`;
    if (seen.has(key)) {
      errors.push(`two edges into "${e.to}" port ${e.port}`);
      continue;
    }
    seen.add(key);
    wired.set(e.to, (wired.get(e.to) ?? 0) + 1);
  }

  // Every gate/output node must have exactly its required inputs wired.
  for (const n of c.nodes) {
    if (n.kind === "input") continue;
    const need = arityOf(n);
    const got = wired.get(n.id) ?? 0;
    if (got !== need)
      errors.push(`node ${n.id} expects ${need} input(s), got ${got}`);
  }

  // Cycle check last; skip when duplicate ids make the node/order counts lie.
  if (!hasDup && topoOrder(c) === null)
    errors.push("circuit has a cycle (combinational only)");

  return { ok: errors.length === 0, errors };
}

function prepare(c: Circuit): {
  nodeMap: Map<string, CircuitNode>;
  inEdges: Map<string, Edge[]>;
  order: string[];
} {
  const v = validate(c);
  if (!v.ok) throw new Error(v.errors.join("; "));
  return {
    nodeMap: new Map(c.nodes.map((n) => [n.id, n] as const)),
    inEdges: incomingByPort(c),
    order: topoOrder(c)!, // validated acyclic
  };
}

function valueOf(
  node: CircuitNode,
  ins: Trit[], // upstream values in port order
  gates: Record<GateName, (a: Trit, b: Trit) => Trit>,
  inputs: Record<string, Trit>,
): Trit {
  if (node.kind === "input") return inputs[node.id] ?? 0;
  if (node.kind === "output") return ins[0];
  const fn = gates[node.gate!];
  // Unary gates are called (a, 0), matching gates.ts's own convention.
  return GATE_ARITY[node.gate!] === 1 ? fn(ins[0], 0) : fn(ins[0], ins[1]);
}

/** One evaluation pass. `record` collects a cumulative snapshot after each
 *  node so simulateSteps can animate propagation; simulate skips it. */
function run(
  c: Circuit,
  record: boolean,
): { values: Record<string, Trit>; order: string[]; frames: Record<string, Trit>[] } {
  const { nodeMap, inEdges, order } = prepare(c);
  const gates = gatesFor(c.system);
  const values: Record<string, Trit> = {};
  const frames: Record<string, Trit>[] = [];
  for (const id of order) {
    const ins = (inEdges.get(id) ?? []).map((e) => values[e.from]);
    values[id] = valueOf(nodeMap.get(id)!, ins, gates, c.inputs);
    if (record) frames.push({ ...values });
  }
  return { values, order, frames };
}

/** Evaluate every node. `values[id]` = that node's output trit; `order` = the
 *  topological evaluation order. Throws (via validate) on invalid circuits. */
export function simulate(c: Circuit): {
  values: Record<string, Trit>;
  order: string[];
} {
  const { values, order } = run(c, false);
  return { values, order };
}

/** Step mode (§17): `frames[k]` is the cumulative values snapshot right after
 *  evaluating `order[k]`. frames.length === node count and the last frame
 *  equals simulate(c).values. */
export function simulateSteps(c: Circuit): {
  order: string[];
  frames: Record<string, Trit>[];
} {
  const { order, frames } = run(c, true);
  return { order, frames };
}
