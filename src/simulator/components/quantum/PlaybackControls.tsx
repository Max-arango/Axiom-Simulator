import { useEffect } from "react";
import { useQuantum, columnCount } from "../../quantum/quantumStore.ts";

const STEP_MS = 700;

export function PlaybackControls() {
  const step = useQuantum((s) => s.step);
  const placements = useQuantum((s) => s.placements);
  const playing = useQuantum((s) => s.playing);
  const stepForward = useQuantum((s) => s.stepForward);
  const stepBack = useQuantum((s) => s.stepBack);
  const gotoStart = useQuantum((s) => s.gotoStart);
  const gotoEnd = useQuantum((s) => s.gotoEnd);
  const play = useQuantum((s) => s.play);
  const pause = useQuantum((s) => s.pause);
  const reset = useQuantum((s) => s.reset);

  const total = columnCount(placements);

  // While playing, advance one column every STEP_MS; stop (pause) at the end.
  // Read fresh store state inside the tick to avoid stale closures.
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      const s = useQuantum.getState();
      if (s.step >= columnCount(s.placements)) {
        s.pause();
        return;
      }
      s.stepForward();
    }, STEP_MS);
    return () => clearInterval(id);
  }, [playing]);

  const togglePlay = () => {
    const s = useQuantum.getState();
    if (s.playing) {
      s.pause();
      return;
    }
    if (s.step >= columnCount(s.placements)) s.gotoStart(); // replay from the top
    s.play();
  };

  const btn =
    "flex size-9 items-center justify-center rounded-lg border border-line bg-void-soft/85 text-[15px] leading-none text-ink transition hover:border-vermilion-400/50 hover:text-vermilion-200 focusable";

  return (
    <div className="flex items-center gap-2 font-mono text-ink">
      <button className={btn} title="Reiniciar circuito" aria-label="Reiniciar circuito" onClick={reset}>
        ⟲
      </button>
      <button className={btn} title="Ir al inicio" aria-label="Ir al inicio" onClick={gotoStart}>
        ⏮
      </button>
      <button className={btn} title="Paso atrás" aria-label="Paso atrás" onClick={stepBack}>
        ◀
      </button>
      <button className={btn} title="Paso adelante" aria-label="Paso adelante" onClick={stepForward}>
        ▶
      </button>
      <button
        className={`${btn} ${playing ? "border-vermilion-400/60 text-vermilion-200" : ""}`}
        title={playing ? "Pausar" : "Reproducir"}
        aria-label={playing ? "Pausar" : "Reproducir"}
        aria-pressed={playing}
        onClick={togglePlay}
      >
        ⏯
      </button>
      <button className={btn} title="Ir al final" aria-label="Ir al final" onClick={gotoEnd}>
        ⏭
      </button>
      <span className="ml-1 text-[11px] text-graphite tabular-nums">
        columna {step} / {total}
      </span>
    </div>
  );
}
