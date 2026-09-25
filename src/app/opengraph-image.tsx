import { ImageResponse } from "next/og";

export const alt = "AXIOM — Open-source mathematical exploration";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const VOID = "#131311";
const VERMILION = "#e0673d";
const INK = "#f0eee5";
const GRAPHITE = "#a5a294";
const LINE = "rgba(240,238,229,0.08)";

const WORKSPACES = [
  "Calculator", "Fractal Lab", "Bloch Sphere", "Quantum Lab",
  "4D Geometry", "Topology", "Dynamics", "Game of Life",
  "Inspector", "Notebook",
];

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: VOID,
          padding: "64px 72px 60px",
          fontFamily: "system-ui, -apple-system, sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Graph-paper grid overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `linear-gradient(to right, ${LINE} 1px, transparent 1px), linear-gradient(to bottom, ${LINE} 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />

        {/* Vermilion glow top-right */}
        <div
          style={{
            position: "absolute",
            top: -120,
            right: -80,
            width: 480,
            height: 480,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(224,103,61,0.18) 0%, transparent 70%)",
          }}
        />

        {/* Brand row */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, position: "relative" }}>
          {/* Logo mark */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 16,
                height: 16,
                backgroundColor: VERMILION,
                borderRadius: 3,
              }}
            />
            <span
              style={{
                fontSize: 20,
                fontWeight: 700,
                letterSpacing: "0.35em",
                color: INK,
                textTransform: "uppercase",
              }}
            >
              AXIOM
            </span>
          </div>
          <div
            style={{
              width: 1,
              height: 20,
              backgroundColor: LINE,
              margin: "0 8px",
            }}
          />
          <span
            style={{
              fontSize: 16,
              color: GRAPHITE,
              letterSpacing: "0.05em",
            }}
          >
            axiom-simulator.vercel.app
          </span>
        </div>

        {/* Hero text */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, position: "relative" }}>
          <div
            style={{
              fontSize: 76,
              fontWeight: 800,
              lineHeight: 1.05,
              color: INK,
              letterSpacing: "-0.02em",
              display: "flex",
            }}
          >
            Explore Mathematics
          </div>
          <div
            style={{
              fontSize: 76,
              fontWeight: 800,
              lineHeight: 1.05,
              color: VERMILION,
              letterSpacing: "-0.02em",
              display: "flex",
            }}
          >
            beyond the graph.
          </div>
          <div
            style={{
              marginTop: 16,
              fontSize: 22,
              color: GRAPHITE,
              letterSpacing: "0.01em",
            }}
          >
            Open-source · 10 live workspaces · one shared math engine
          </div>
        </div>

        {/* Workspace chips + sinusoidal decoration */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14, position: "relative" }}>
          {/* Chips — two rows of 5 */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {WORKSPACES.map((ws) => (
              <div
                key={ws}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "5px 14px",
                  borderRadius: 6,
                  border: `1px solid rgba(240,238,229,0.12)`,
                  backgroundColor: "rgba(240,238,229,0.05)",
                  fontSize: 14,
                  color: GRAPHITE,
                  letterSpacing: "0.02em",
                }}
              >
                {ws}
              </div>
            ))}
          </div>

          {/* Bottom bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span style={{ fontSize: 13, color: "rgba(165,162,148,0.5)", letterSpacing: "0.08em" }}>
              MIT License · Free · No registration required
            </span>
            {/* Mini sine wave */}
            <svg width="200" height="32" viewBox="0 0 200 32">
              <path
                d="M0 16 C 16 16, 20 4, 40 4 S 60 28, 80 28 S 100 4, 120 4 S 140 28, 160 28 S 180 16, 200 16"
                fill="none"
                stroke={VERMILION}
                strokeWidth="2.5"
                strokeLinecap="round"
                opacity="0.7"
              />
            </svg>
          </div>
        </div>
      </div>
    ),
    size
  );
}
