import { cn } from "@/lib/utils";
import type { System, Trit } from "@/lib/ternary";

// Restrained accent by value, using existing theme tokens (no new palette):
// negative → destructive, zero → muted, positive → primary.
const tone = (v: Trit): string =>
  v < 0
    ? "text-destructive border-destructive/30"
    : v === 0
      ? "text-muted-foreground border-border"
      : "text-primary border-primary/30";

// Balanced shows an explicit +1 (to distinguish sign); unbalanced digits
// (0/1/2) and the other balanced digits (-1/0) render as their plain number.
const label = (v: Trit, system: System): string =>
  system === "balanced" && v === 1 ? "+1" : String(v);

/** One trit as a bordered monospace cell. Reused wherever trits are shown. */
export function TritCell({
  value,
  system,
  className,
}: {
  value: Trit;
  system: System;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-9 min-w-9 items-center justify-center rounded-md border px-2 font-mono text-sm tabular-nums",
        tone(value),
        className,
      )}
    >
      {label(value, system)}
    </span>
  );
}

/** A little-endian trit vector rendered MSB-first with 3^i place captions. */
export function TritRow({ trits, system }: { trits: Trit[]; system: System }) {
  // Engine vectors are little-endian (index 0 = 3^0). Display MSB-first so the
  // row reads like a conventional number. Zero normalizes to [] → one 0 cell.
  const cells = trits.length ? trits : ([0] as Trit[]);
  return (
    <div className="flex flex-wrap gap-1.5">
      {cells
        .map((t, exp) => ({ t, exp }))
        .reverse()
        .map(({ t, exp }) => (
          <div key={exp} className="flex flex-col items-center gap-0.5">
            <TritCell value={t} system={system} />
            <span className="text-muted-foreground font-mono text-[10px]">
              3^{exp}
            </span>
          </div>
        ))}
    </div>
  );
}
