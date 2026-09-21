// Global keyboard shortcuts for the Quantum Lab. Renders nothing; installs one
// window keydown listener. Reads actions via getState() to avoid stale closures.
import { useEffect } from "react";
import { useQuantum } from "../../quantum/quantumStore.ts";

function isTyping(el: EventTarget | null): boolean {
  const n = el as HTMLElement | null;
  if (!n) return false;
  if (/^(INPUT|TEXTAREA|SELECT)$/.test(n.tagName)) return true;
  return n.isContentEditable === true;
}

export function KeyboardShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;
      const s = useQuantum.getState();
      const mod = e.ctrlKey || e.metaKey;

      if (mod && (e.key === "z" || e.key === "Z")) {
        e.preventDefault();
        if (e.shiftKey) s.redo();
        else s.undo();
        return;
      }
      if (mod && (e.key === "y" || e.key === "Y")) {
        e.preventDefault();
        s.redo();
        return;
      }
      if (mod) return; // leave other Ctrl/Cmd combos to the browser

      switch (e.key) {
        case "ArrowRight":
          e.preventDefault();
          s.stepForward();
          break;
        case "ArrowLeft":
          e.preventDefault();
          s.stepBack();
          break;
        case "Home":
          e.preventDefault();
          s.gotoStart();
          break;
        case "End":
          e.preventDefault();
          s.gotoEnd();
          break;
        case " ":
          e.preventDefault();
          if (s.playing) s.pause();
          else s.play();
          break;
        case "r":
        case "R":
          s.runShots();
          break;
        case "Delete":
        case "Backspace":
          if (s.selectedId) {
            e.preventDefault();
            s.removePlacement(s.selectedId);
          }
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return null;
}
