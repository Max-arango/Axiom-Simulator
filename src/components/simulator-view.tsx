"use client";

import dynamic from "next/dynamic";
import type { AppMode } from "@/simulator/store";

// The simulator is fully client-side (WebGL, requestAnimationFrame, window,
// document), so it must never SSR.
const SimApp = dynamic(() => import("@/simulator/App").then((m) => m.App), {
  ssr: false,
  loading: () => <div className="dark sim-shell" />,
});

interface Props {
  initialMode?: AppMode;
}

export function SimulatorView({ initialMode }: Props) {
  return (
    <div className="dark sim-shell">
      <SimApp initialMode={initialMode} />
    </div>
  );
}
