import { useEffect, useRef } from "react";
import { useLifeStore } from "../../life/store.ts";
import { LifePanel } from "./LifePanel.tsx";
import { LifeCanvas } from "./LifeCanvas.tsx";

function useLifeDriver() {
  const running = useLifeStore((s) => s.running);
  const speed = useLifeStore((s) => s.speed);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => useLifeStore.getState().tick(), 1000 / speed);
    return () => clearInterval(id);
  }, [running, speed]);
}

function useLifeKeys() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;
      if (el.isContentEditable) return;
      const s = useLifeStore.getState();
      switch (e.key) {
        case " ": e.preventDefault(); s.toggle(); break;
        case "n": case "N": s.step(); break;
        case "r": case "R": s.reset(); break;
        case "c": case "C": s.clear(); break;
        case "Escape": s.setSelectedPattern(null); break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}

export function LifeView() {
  useLifeDriver();
  useLifeKeys();

  // Auto-randomize once when the workspace first mounts.
  const initialized = useRef(false);
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    useLifeStore.getState().randomize();
  }, []);

  return (
    <div className="flex h-full min-h-0 flex-1 bg-void text-ink">
      <aside className="scroll-thin w-[300px] shrink-0 overflow-y-auto border-r border-line bg-void-soft/40">
        <LifePanel />
      </aside>
      <main className="relative flex-1 overflow-hidden">
        <LifeCanvas />
      </main>
    </div>
  );
}
