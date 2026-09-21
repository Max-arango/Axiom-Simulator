// Monte-Carlo noise controls. Noise affects only the shot histogram (Medición) —
// the ideal statevector/Bloch panels stay exact. Run many shots to see the effect.
import { useQuantum } from "../../quantum/quantumStore.ts";

const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

export function NoisePanel() {
  const noise = useQuantum((s) => s.noise);
  const setNoise = useQuantum((s) => s.setNoise);

  return (
    <div className="flex flex-col gap-2 font-mono text-[11px] text-ink">
      <label className="focusable flex cursor-pointer items-center gap-2">
        <input type="checkbox" checked={noise.enabled} onChange={(e) => setNoise({ enabled: e.target.checked })} />
        Activar ruido (Monte-Carlo)
      </label>

      <Slider
        label="Despolarizante / puerta"
        value={noise.depolarizing}
        disabled={!noise.enabled}
        onChange={(v) => setNoise({ depolarizing: v })}
      />
      <Slider
        label="Error de lectura"
        value={noise.readout}
        disabled={!noise.enabled}
        onChange={(v) => setNoise({ readout: v })}
      />

      <p className="leading-relaxed text-graphite">
        El ruido solo afecta a los <span className="text-ink">shots</span> (pestaña Medición): cada ejecución aplica
        errores estocásticos (Paulis aleatorios por puerta, bit-flip de lectura). Ejecuta muchos shots para ver el
        efecto medio. Los paneles de estado ideal no cambian.
      </p>
    </div>
  );
}

function Slider({
  label, value, disabled, onChange,
}: { label: string; value: number; disabled: boolean; onChange: (v: number) => void }) {
  return (
    <div className={disabled ? "opacity-50" : ""}>
      <div className="mb-0.5 flex items-center justify-between text-graphite">
        <span>{label}</span>
        <span className="tabular-nums text-vermilion-300">{pct(value)}</span>
      </div>
      <input
        type="range"
        min={0}
        max={0.2}
        step={0.005}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
        className="w-full focusable"
      />
    </div>
  );
}
