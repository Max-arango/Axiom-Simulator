"use client";

import { useEffect, useState } from "react";
import {
  GATE_ARITY,
  MAX_CIRCUIT_EDGES,
  MAX_CIRCUIT_NODES,
  simulate,
  simulateSteps,
  tritValues,
  validate,
  type Circuit,
  type CircuitNode,
  type GateName,
  type System,
  type Trit,
} from "@/lib/ternary";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TritCell } from "../trit-cell";

const GATE_NAMES = Object.keys(GATE_ARITY) as GateName[];
const NONE = "__none__"; // Radix Select can't hold value="" — sentinel to clear a wire.
const STORE_PREFIX = "axiom.circuit."; // localStorage key namespace for saved circuits.

/** Required input ports: input=0, output=1, gate=its arity. */
function portsOf(n: CircuitNode): number {
  if (n.kind === "input") return 0;
  if (n.kind === "output") return 1;
  return n.gate ? GATE_ARITY[n.gate] : 0;
}

/** Human label for a node in cards and select options. */
function nodeName(n: CircuitNode): string {
  if (n.kind === "gate") return n.gate ?? "gate";
  return n.label || n.id;
}

/** COMPARE emits a balanced trit regardless of system; everything else follows system. */
function outSystemFor(n: CircuitNode, system: System): System {
  return n.kind === "gate" && n.gate === "COMPARE" ? "balanced" : system;
}

/** Topological depth per node (inputs = 0). Memoized DFS with a visiting guard
 *  so a cycle in a half-edited circuit lays out (as depth 0) instead of hanging. */
function computeDepths(c: Circuit): Record<string, number> {
  const incoming = new Map<string, string[]>();
  for (const e of c.edges) {
    let l = incoming.get(e.to);
    if (!l) incoming.set(e.to, (l = []));
    l.push(e.from);
  }
  const depth: Record<string, number> = {};
  const visiting = new Set<string>();
  const calc = (id: string): number => {
    if (id in depth) return depth[id];
    if (visiting.has(id)) return 0; // ponytail: cycle guard, breaks recursion at the back-edge
    visiting.add(id);
    let d = 0;
    for (const src of incoming.get(id) ?? []) d = Math.max(d, calc(src) + 1);
    visiting.delete(id);
    return (depth[id] = d);
  };
  for (const n of c.nodes) calc(n.id);
  return depth;
}

/** A correct, non-empty starting circuit: 2 inputs (A,B) → SUM + CARRY → 2 outputs. */
export function halfAdderSeed(system: System): Circuit {
  return {
    system,
    inputs: { n1: 1, n2: 1 },
    nodes: [
      { id: "n1", kind: "input", label: "A" },
      { id: "n2", kind: "input", label: "B" },
      { id: "n3", kind: "gate", gate: "SUM" },
      { id: "n4", kind: "gate", gate: "CARRY" },
      { id: "n5", kind: "output", label: "S" },
      { id: "n6", kind: "output", label: "C" },
    ],
    edges: [
      { from: "n1", to: "n3", port: 0 },
      { from: "n2", to: "n3", port: 1 },
      { from: "n1", to: "n4", port: 0 },
      { from: "n2", to: "n4", port: 1 },
      { from: "n3", to: "n5", port: 0 },
      { from: "n4", to: "n6", port: 0 },
    ],
  };
}

type StepState = {
  order: string[];
  frames: Record<string, Trit>[];
  index: number;
};

export function CircuitEditor({ system }: { system: System }) {
  const [circuit, setCircuit] = useState<Circuit>(() => halfAdderSeed(system));
  // Next auto id counter — deterministic (no Math.random). Seed used n1..n6.
  const [nextId, setNextId] = useState(7);
  const [gateToAdd, setGateToAdd] = useState<GateName>("AND");
  // Seed shows correct values on first paint; edits/Reset clear back to null.
  const [values, setValues] = useState<Record<string, Trit> | null>(() => {
    try {
      return simulate(halfAdderSeed(system)).values;
    } catch {
      return null;
    }
  });
  const [step, setStep] = useState<StepState | null>(null);
  const [highlight, setHighlight] = useState<string | null>(null);
  // Save/Load (localStorage only; DB deferred).
  const [saveName, setSaveName] = useState("my-circuit");
  const [saved, setSaved] = useState<string[]>([]);
  const [loadName, setLoadName] = useState<string>("");

  const refreshSaved = () => {
    if (typeof window === "undefined") return;
    const names: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(STORE_PREFIX)) names.push(k.slice(STORE_PREFIX.length));
    }
    names.sort();
    setSaved(names);
  };
  useEffect(refreshSaved, []);

  const v = validate(circuit);
  const atNodeCap = circuit.nodes.length >= MAX_CIRCUIT_NODES;
  const atEdgeCap = circuit.edges.length >= MAX_CIRCUIT_EDGES;

  const clearRun = () => {
    setValues(null);
    setStep(null);
    setHighlight(null);
  };
  // Any structural edit invalidates prior sim output.
  const edit = (fn: (c: Circuit) => Circuit) => {
    setCircuit(fn);
    clearRun();
  };

  function addNode(partial: Omit<CircuitNode, "id">) {
    if (atNodeCap) return;
    const id = `n${nextId}`;
    setNextId((k) => k + 1);
    edit((c) => ({
      ...c,
      nodes: [...c.nodes, { id, ...partial }],
      inputs:
        partial.kind === "input" ? { ...c.inputs, [id]: 0 } : c.inputs,
    }));
  }

  function deleteNode(id: string) {
    edit((c) => {
      const inputs = { ...c.inputs };
      delete inputs[id];
      return {
        ...c,
        nodes: c.nodes.filter((n) => n.id !== id),
        edges: c.edges.filter((e) => e.from !== id && e.to !== id),
        inputs,
      };
    });
  }

  function setLabel(id: string, label: string) {
    edit((c) => ({
      ...c,
      nodes: c.nodes.map((n) => (n.id === id ? { ...n, label } : n)),
    }));
  }

  function setInputValue(id: string, t: Trit) {
    edit((c) => ({ ...c, inputs: { ...c.inputs, [id]: t } }));
  }

  // Connect (or clear, from=null) a source to target port, replacing any wire there.
  function setWire(to: string, port: number, from: string | null) {
    edit((c) => {
      const edges = c.edges.filter((e) => !(e.to === to && e.port === port));
      if (from) {
        if (edges.length >= MAX_CIRCUIT_EDGES) return c; // at cap: refuse a new wire
        edges.push({ from, to, port });
      }
      return { ...c, edges };
    });
  }

  function run() {
    try {
      setValues(simulate(circuit).values);
      setStep(null);
      setHighlight(null);
    } catch {
      /* Run is disabled while invalid; guard is belt-and-suspenders. */
    }
  }

  function stepOnce() {
    try {
      if (!step) {
        const { order, frames } = simulateSteps(circuit);
        if (!frames.length) return;
        setStep({ order, frames, index: 0 });
        setValues(frames[0]);
        setHighlight(order[0]);
      } else {
        const index = Math.min(step.index + 1, step.frames.length - 1);
        setStep({ ...step, index });
        setValues(step.frames[index]);
        setHighlight(step.order[index]);
      }
    } catch {
      /* disabled while invalid */
    }
  }

  function save() {
    if (typeof window === "undefined") return;
    const name = saveName.trim();
    if (!name) return;
    try {
      localStorage.setItem(STORE_PREFIX + name, JSON.stringify(circuit));
      refreshSaved();
    } catch {
      /* quota / disabled storage — nothing to do but skip */
    }
  }

  function load(name: string) {
    if (typeof window === "undefined" || !name) return;
    const raw = localStorage.getItem(STORE_PREFIX + name);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as Circuit;
      if (!parsed || !Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges))
        return; // guard malformed JSON
      setCircuit(parsed);
      clearRun();
    } catch {
      /* corrupt entry — ignore */
    }
  }

  const depths = computeDepths(circuit);
  const maxDepth = circuit.nodes.reduce(
    (m, n) => Math.max(m, depths[n.id] ?? 0),
    0,
  );
  const columns: CircuitNode[][] = [];
  for (let d = 0; d <= maxDepth; d++)
    columns.push(circuit.nodes.filter((n) => (depths[n.id] ?? 0) === d));

  const stepLabel = step
    ? `Step ${step.index + 1}/${step.frames.length}`
    : "Step";

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground text-sm">
        Wire a combinational ternary circuit. Nodes are laid out by dependency
        depth; connect each gate/output port to a source, then Run or Step.
        Seeded with a half-adder (A + B → SUM, CARRY).
      </p>

      {/* Add nodes */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="mono-label text-muted-foreground text-xs uppercase">
          Add
        </span>
        <Button
          size="sm"
          variant="outline"
          disabled={atNodeCap}
          onClick={() =>
            addNode({ kind: "input", label: `in${nextId}` })
          }
        >
          + Input
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={atNodeCap}
          onClick={() => addNode({ kind: "output", label: `out${nextId}` })}
        >
          + Output
        </Button>
        <div className="flex items-center gap-1">
          <Select
            value={gateToAdd}
            onValueChange={(x) => setGateToAdd(x as GateName)}
          >
            <SelectTrigger className="h-8 w-32 font-mono">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {GATE_NAMES.map((g) => (
                <SelectItem key={g} value={g} className="font-mono">
                  {g}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant="outline"
            disabled={atNodeCap}
            onClick={() => addNode({ kind: "gate", gate: gateToAdd })}
          >
            + Gate
          </Button>
        </div>
        <span className="text-muted-foreground font-mono text-xs">
          {circuit.nodes.length}/{MAX_CIRCUIT_NODES} nodes ·{" "}
          {circuit.edges.length}/{MAX_CIRCUIT_EDGES} edges
        </span>
      </div>
      {(atNodeCap || atEdgeCap) && (
        <p className="text-destructive text-xs">
          {atNodeCap && `Node cap (${MAX_CIRCUIT_NODES}) reached. `}
          {atEdgeCap && `Edge cap (${MAX_CIRCUIT_EDGES}) reached.`}
        </p>
      )}

      {/* Run controls */}
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={run} disabled={!v.ok}>
          Run
        </Button>
        <Button size="sm" variant="secondary" onClick={stepOnce} disabled={!v.ok}>
          {stepLabel}
        </Button>
        <Button size="sm" variant="outline" onClick={clearRun}>
          Reset
        </Button>
      </div>

      {/* Live validation */}
      {!v.ok && (
        <div className="space-y-1 rounded-md border border-destructive/30 p-3">
          <div className="mono-label text-destructive text-xs uppercase">
            {v.errors.length} error(s)
          </div>
          <ul className="text-destructive list-disc space-y-0.5 pl-5 text-sm">
            {v.errors.map((e, i) => (
              <li key={i} className="font-mono">
                {e}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Layered layout */}
      <div className="flex gap-4 overflow-x-auto pb-2">
        {columns.map((col, d) => (
          <div key={d} className="flex min-w-52 flex-col gap-3">
            <div className="mono-label text-muted-foreground text-xs uppercase">
              depth {d}
            </div>
            {col.map((n) => {
              const val = values?.[n.id];
              const ports = portsOf(n);
              return (
                <Card
                  key={n.id}
                  className={
                    highlight === n.id
                      ? "gap-3 py-3 ring-2 ring-primary"
                      : "gap-3 py-3"
                  }
                >
                  <CardHeader className="px-3">
                    <CardTitle className="flex items-center justify-between gap-2 text-sm">
                      <span className="font-mono">
                        {nodeName(n)}
                        <span className="text-muted-foreground ml-1 text-xs">
                          {n.id} · {n.kind}
                        </span>
                      </span>
                      {val !== undefined ? (
                        <TritCell value={val} system={outSystemFor(n, system)} />
                      ) : null}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 px-3">
                    {n.kind === "input" && (
                      <>
                        <Input
                          value={n.label ?? ""}
                          onChange={(e) => setLabel(n.id, e.target.value)}
                          className="h-8 font-mono text-xs"
                          aria-label={`label for ${n.id}`}
                        />
                        <ToggleGroup
                          type="single"
                          variant="outline"
                          size="sm"
                          value={String(circuit.inputs[n.id] ?? 0)}
                          onValueChange={(x) =>
                            x && setInputValue(n.id, Number(x) as Trit)
                          }
                        >
                          {tritValues(system).map((t) => (
                            <ToggleGroupItem
                              key={t}
                              value={String(t)}
                              className="px-2 font-mono"
                            >
                              {system === "balanced" && t === 1 ? "+1" : t}
                            </ToggleGroupItem>
                          ))}
                        </ToggleGroup>
                      </>
                    )}

                    {ports > 0 &&
                      Array.from({ length: ports }, (_, port) => {
                        const wired = circuit.edges.find(
                          (e) => e.to === n.id && e.port === port,
                        );
                        return (
                          <div key={port} className="space-y-1">
                            <Label className="text-muted-foreground text-[10px] uppercase">
                              in {port}
                            </Label>
                            <Select
                              value={wired?.from ?? NONE}
                              onValueChange={(x) =>
                                setWire(n.id, port, x === NONE ? null : x)
                              }
                            >
                              <SelectTrigger className="h-8 w-full font-mono text-xs">
                                <SelectValue placeholder="—" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value={NONE}>—</SelectItem>
                                {circuit.nodes
                                  .filter((s) => s.id !== n.id)
                                  .map((s) => (
                                    <SelectItem
                                      key={s.id}
                                      value={s.id}
                                      className="font-mono"
                                    >
                                      {nodeName(s)} · {s.id}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </div>
                        );
                      })}

                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive h-7 w-full text-xs"
                      onClick={() => deleteNode(n.id)}
                    >
                      Delete
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ))}
      </div>

      <Separator />

      {/* Save / Load (localStorage only) */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label htmlFor="circuit-name" className="text-xs">
            Save as
          </Label>
          <div className="flex gap-1">
            <Input
              id="circuit-name"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              className="h-8 w-40 font-mono text-xs"
            />
            <Button size="sm" variant="outline" onClick={save}>
              Save
            </Button>
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Load</Label>
          <div className="flex gap-1">
            <Select
              value={loadName}
              onValueChange={(x) => setLoadName(x)}
              disabled={saved.length === 0}
            >
              <SelectTrigger className="h-8 w-40 font-mono text-xs">
                <SelectValue placeholder="saved…" />
              </SelectTrigger>
              <SelectContent>
                {saved.map((name) => (
                  <SelectItem key={name} value={name} className="font-mono">
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant="outline"
              disabled={!loadName}
              onClick={() => load(loadName)}
            >
              Load
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
