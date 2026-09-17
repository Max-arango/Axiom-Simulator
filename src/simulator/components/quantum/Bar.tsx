// Reusable horizontal proportion bar: label left, filled track, percent right.
// Extracted verbatim from bloch/ProbabilityBars so State + Measurement panels
// share one bar look. Pure display; p is a fraction in [0,1].

export function Bar({ label, p, color }: { label: string; p: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-8 shrink-0 text-right font-mono text-[11px] text-stone-300">{label}</span>
      <div className="relative h-3.5 flex-1 overflow-hidden rounded bg-white/5">
        <div className="h-full rounded transition-[width] duration-200" style={{ width: `${p * 100}%`, background: color }} />
      </div>
      <span className="w-11 shrink-0 text-right font-mono text-[11px] tabular-nums text-stone-200">{(p * 100).toFixed(1)}%</span>
    </div>
  );
}
