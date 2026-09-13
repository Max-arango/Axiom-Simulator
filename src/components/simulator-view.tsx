"use client";

import dynamic from "next/dynamic";

// The simulator is fully client-side (WebGL, requestAnimationFrame, window,
// document), so it must never SSR. `dark sim-shell` forces the simulator's
// always-dark register regardless of the site theme and reuses the landing's
// `.dark` tokens (foreground/border/muted) for ink/line/graphite.
const SimApp = dynamic(() => import("@/simulator/App").then((m) => m.App), {
  ssr: false,
  loading: () => <div className="dark sim-shell" />,
});

export function SimulatorView() {
  return (
    <div className="dark sim-shell">
      <SimApp />
    </div>
  );
}
