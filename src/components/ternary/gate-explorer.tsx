"use client";

import { useState } from "react";
import {
  GATE_ARITY,
  GATE_DOC,
  truthTableFor,
  type GateName,
  type System,
} from "@/lib/ternary";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TritCell } from "./trit-cell";

// Names come straight from the engine's arity record — no separate list to
// drift out of sync.
const GATE_NAMES = Object.keys(GATE_ARITY) as GateName[];

export function GateExplorer({ system }: { system: System }) {
  const [name, setName] = useState<GateName>("AND");
  const arity = GATE_ARITY[name];
  const rows = truthTableFor(system, name);
  // The engine marks XOR/XNOR as AXIOM-defined in their doc string; read that
  // marking rather than hardcoding which gates are non-standard.
  const axiomDefined = GATE_DOC[name].includes("AXIOM-defined");
  // COMPARE always yields a balanced trit regardless of the input system.
  const outSystem: System = name === "COMPARE" ? "balanced" : system;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={name} onValueChange={(v) => setName(v as GateName)}>
          <SelectTrigger className="w-40 font-mono">
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
        {axiomDefined ? (
          <Badge variant="secondary">AXIOM-defined</Badge>
        ) : (
          <Badge variant="outline">standard</Badge>
        )}
      </div>

      <p className="text-muted-foreground text-sm">{GATE_DOC[name]}</p>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="font-mono">a</TableHead>
            {arity === 2 && <TableHead className="font-mono">b</TableHead>}
            <TableHead className="font-mono">{name}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r, i) => (
            <TableRow key={i}>
              <TableCell>
                <TritCell value={r.inputs[0]} system={system} />
              </TableCell>
              {arity === 2 && (
                <TableCell>
                  <TritCell value={r.inputs[1]} system={system} />
                </TableCell>
              )}
              <TableCell>
                <TritCell value={r.output} system={outSystem} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
