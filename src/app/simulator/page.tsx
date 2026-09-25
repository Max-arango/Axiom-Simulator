import type { Metadata } from "next";
import { SimulatorView } from "@/components/simulator-view";

export const metadata: Metadata = {
  title: "AXIOM Simulator — Open-Source Math Playground",
  description: "10 interactive workspaces in one open-source math simulator: graphing calculator, Mandelbrot fractals, quantum circuits, Conway's Game of Life, topology, 4D geometry, dynamical systems and more.",
  keywords: [
    "axiom simulator", "axiom math", "math simulator", "mathematics simulator",
    "open source math", "interactive math", "math playground", "math explorer",
    "graphing calculator online", "fractal explorer", "quantum simulator",
    "game of life", "topology explorer", "dynamical systems",
  ],
  alternates: { canonical: "https://axiom-simulator.vercel.app/simulator" },
  openGraph: {
    title: "AXIOM — Open-Source Math Simulator",
    description: "10 interactive workspaces: graphing, fractals, quantum circuits, Game of Life, topology, 4D geometry and more. Free and open source.",
    url: "https://axiom-simulator.vercel.app/simulator",
    type: "website",
  },
};

export default function SimulatorPage() {
  return <SimulatorView />;
}
