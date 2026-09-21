import { useQuantum } from "../../quantum/quantumStore.ts";

const btn =
  "flex size-9 items-center justify-center rounded-lg border border-line bg-void-soft text-[15px] leading-none text-ink text-graphite transition hover:text-vermilion-200 disabled:opacity-40 focusable";

export function UndoRedoButtons() {
  const canUndo = useQuantum((s) => s.past.length) > 0;
  const canRedo = useQuantum((s) => s.future.length) > 0;
  const undo = useQuantum((s) => s.undo);
  const redo = useQuantum((s) => s.redo);

  return (
    <div className="flex items-center gap-2 font-mono">
      <button className={btn} title="Deshacer" aria-label="Deshacer" disabled={!canUndo} onClick={undo}>
        ↶
      </button>
      <button className={btn} title="Rehacer" aria-label="Rehacer" disabled={!canRedo} onClick={redo}>
        ↷
      </button>
    </div>
  );
}
