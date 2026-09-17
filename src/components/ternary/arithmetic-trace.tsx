"use client";

import { useState } from "react";
import { addTrace, decode, encode, type Trit } from "@/lib/ternary";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TritCell, TritRow } from "./trit-cell";

// addTrace is balanced-only (it asserts balanced inputs), so this tab always
// works in the balanced system regardless of the lab's system toggle.
function toBalanced(raw: string): { trits?: Trit[]; n?: number } {
  const n = Number(raw);
  if (raw.trim() === "" || !Number.isInteger(n)) return {};
  return { trits: encode(n, "balanced").trits, n };
}

export function ArithmeticTrace() {
  const [aRaw, setARaw] = useState("5");
  const [bRaw, setBRaw] = useState("-3");
  const a = toBalanced(aRaw);
  const b = toBalanced(bRaw);
  const trace = a.trits && b.trits ? addTrace(a.trits, b.trits) : undefined;
  const sum = trace ? decode({ system: "balanced", trits: trace.result }) : undefined;

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground text-sm">
        Balanced-ternary addition, digit by digit. Carry propagates low → high.
      </p>

      <div className="flex flex-wrap gap-4">
        <div className="space-y-2">
          <Label htmlFor="add-a">A</Label>
          <Input
            id="add-a"
            type="number"
            value={aRaw}
            onChange={(e) => setARaw(e.target.value)}
            className="w-28 font-mono"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="add-b">B</Label>
          <Input
            id="add-b"
            type="number"
            value={bRaw}
            onChange={(e) => setBRaw(e.target.value)}
            className="w-28 font-mono"
          />
        </div>
      </div>

      {trace && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>place</TableHead>
                <TableHead>a</TableHead>
                <TableHead>b</TableHead>
                <TableHead>carryIn</TableHead>
                <TableHead>digit</TableHead>
                <TableHead>carryOut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trace.steps.map((s) => (
                <TableRow key={s.index}>
                  <TableCell className="font-mono">3^{s.index}</TableCell>
                  <TableCell>
                    <TritCell value={s.a} system="balanced" />
                  </TableCell>
                  <TableCell>
                    <TritCell value={s.b} system="balanced" />
                  </TableCell>
                  <TableCell className="font-mono tabular-nums">
                    {s.carryIn}
                  </TableCell>
                  <TableCell>
                    <TritCell value={s.digit} system="balanced" />
                  </TableCell>
                  <TableCell className="font-mono tabular-nums">
                    {s.carryOut}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="space-y-2">
            <div className="mono-label text-muted-foreground text-xs uppercase">
              result
            </div>
            <TritRow trits={trace.result} system="balanced" />
            <p className="font-mono text-sm">
              {a.n} + {b.n} ={" "}
              <span className="text-primary">{sum}</span>{" "}
              {sum === (a.n ?? 0) + (b.n ?? 0) ? "✓" : "✗"}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
