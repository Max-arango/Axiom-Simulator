"use client";

import { useState } from "react";
import { decode, encode, tritValues, type System, type Trit } from "@/lib/ternary";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { TritRow } from "./trit-cell";

// encode() throws for values a system can't represent (negative unbalanced);
// catch it so both systems can be surfaced independently.
function encodeSafe(n: number, system: System): { trits?: Trit[]; error?: string } {
  try {
    return { trits: encode(n, system).trits };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

const other = (s: System): System => (s === "balanced" ? "unbalanced" : "balanced");

export function Converter({ system }: { system: System }) {
  const [raw, setRaw] = useState("5");
  const n = Number(raw);
  // isSafeInteger (not isInteger): rejects values like 1e21 that are "integers"
  // but exceed float precision, which would make encode() loop on bad math.
  const valid = raw.trim() !== "" && Number.isSafeInteger(n);

  const cur = valid ? encodeSafe(n, system) : undefined;
  const oth = valid ? encodeSafe(n, other(system)) : undefined;
  const readback =
    cur?.trits !== undefined ? decode({ system, trits: cur.trits }) : undefined;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="decimal-in">Decimal integer</Label>
        <Input
          id="decimal-in"
          type="number"
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          className="max-w-xs font-mono"
        />
        {!valid && raw.trim() !== "" && (
          <p className="text-destructive text-sm">Enter a whole integer.</p>
        )}
      </div>

      {valid && (
        <div className="space-y-6">
          <section className="space-y-2">
            <div className="mono-label text-muted-foreground text-xs uppercase">
              {system} · digits {tritValues(system).join(" ")}
            </div>
            {cur?.error ? (
              <p className="text-destructive text-sm">{cur.error}</p>
            ) : (
              <TritRow trits={cur!.trits!} system={system} />
            )}
          </section>

          <Separator />

          <section className="space-y-2">
            <div className="mono-label text-muted-foreground text-xs uppercase">
              {other(system)} (for comparison)
            </div>
            {oth?.error ? (
              <p className="text-muted-foreground text-sm">{oth.error}</p>
            ) : (
              <TritRow trits={oth!.trits!} system={other(system)} />
            )}
          </section>

          <Separator />

          <section className="space-y-1">
            <div className="mono-label text-muted-foreground text-xs uppercase">
              decode round-trip
            </div>
            {readback !== undefined ? (
              <p className="font-mono text-sm">
                decode(encode({n})) ={" "}
                <span className="text-primary">{readback}</span>{" "}
                {readback === n ? "✓" : "✗"}
              </p>
            ) : (
              <p className="text-muted-foreground text-sm">
                Not representable in {system}; see note above.
              </p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
