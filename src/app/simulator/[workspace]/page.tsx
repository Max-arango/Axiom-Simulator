import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SimulatorView } from "@/components/simulator-view";
import { SEGMENT_TO_MODE } from "@/simulator/routes";
import type { AppMode } from "@/simulator/store";

const BASE = "https://axiom-simulator.vercel.app";

const WORKSPACE_META: Record<string, { title: string; description: string; keywords: string[] }> = {
  calculator: {
    title: "Graphing Calculator — 2D & 3D Functions",
    description: "Interactive graphing calculator for 2D and 3D mathematical functions. Plot, differentiate and explore equations with AXIOM's open-source math engine.",
    keywords: ["graphing calculator", "math calculator", "3D grapher", "function plotter", "symbolic differentiation", "online graphing calculator"],
  },
  fractal: {
    title: "Fractal Lab — Mandelbrot & Julia Sets",
    description: "GPU-accelerated fractal explorer. Zoom into the Mandelbrot set, Julia sets, and custom fractals with real-time WebGL rendering.",
    keywords: ["fractal explorer", "mandelbrot set", "julia set", "fractal generator", "webgl fractals", "complex dynamics"],
  },
  bloch: {
    title: "Bloch Sphere — Qubit Visualization",
    description: "Interactive Bloch sphere for single-qubit quantum state visualization. Explore quantum superposition and state vectors in 3D.",
    keywords: ["bloch sphere", "qubit visualization", "quantum state", "quantum computing simulator", "quantum mechanics"],
  },
  quantum: {
    title: "Quantum Lab — Circuit Simulator",
    description: "IBM-inspired quantum circuit simulator. Build and simulate quantum gates, measure entanglement and visualize quantum states.",
    keywords: ["quantum circuit simulator", "quantum computing", "quantum gates", "quantum lab", "qasm", "quantum entanglement"],
  },
  "4d": {
    title: "4D Geometry — Tesseract & Polytopes",
    description: "Explore four-dimensional geometry: tesseract, 4D polytopes and higher-dimensional projections rendered in real time.",
    keywords: ["4d geometry", "tesseract", "hypercube", "4d polytope", "higher dimensional geometry", "four dimensions"],
  },
  topology: {
    title: "Topology — Shapes & Homeomorphisms",
    description: "Interactive topology explorer: deform surfaces, visualize homeomorphisms, and study the Euler characteristic of mathematical shapes.",
    keywords: ["topology", "homeomorphism", "torus", "euler characteristic", "surface topology", "algebraic topology"],
  },
  dynamics: {
    title: "Dynamics — Phase Portraits & ODE Solver",
    description: "Visualize dynamical systems, phase portraits, Lorenz attractors and solve ODEs interactively. Explore chaos theory in real time.",
    keywords: ["dynamical systems", "phase portrait", "lorenz attractor", "ode solver", "chaos theory", "bifurcation"],
  },
  "dynamics-3d": {
    title: "3D Dynamics — Strange Attractors",
    description: "Three-dimensional dynamical systems simulator. Explore Lorenz, Rössler and custom strange attractors with interactive 3D rendering.",
    keywords: ["strange attractor", "lorenz 3d", "rossler attractor", "3d dynamics", "chaos 3d", "dynamical systems 3d"],
  },
  life: {
    title: "Game of Life — Conway's Cellular Automaton",
    description: "Conway's Game of Life simulator with pattern library, shareable boards, population graphs and zoom/pan canvas. Free and open source.",
    keywords: ["game of life", "conway game of life", "cellular automaton", "conway simulator", "game of life simulator", "glider gun", "life patterns"],
  },
  inspector: {
    title: "Math Inspector — AST & Structure Analysis",
    description: "Inspect the abstract syntax tree and mathematical structure of any expression. Decompose eigenvalues, matrices and ODEs.",
    keywords: ["math inspector", "abstract syntax tree", "eigenvalue calculator", "matrix decomposition", "mathematical analysis"],
  },
  notebook: {
    title: "Math Notebook — Reproducible Experiments",
    description: "Literate mathematical computing notebook. Write, compute and share reproducible mathematical experiments with live output.",
    keywords: ["math notebook", "computational notebook", "reproducible math", "mathematical computing", "jupyter alternative"],
  },
  docs: {
    title: "Math Documentation — Reference & Guide",
    description: "Bilingual mathematical reference documentation covering calculus, linear algebra, ODEs, cellular automata and more.",
    keywords: ["math documentation", "mathematics reference", "calculus reference", "linear algebra guide", "math tutorial"],
  },
};

type Props = { params: Promise<{ workspace: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { workspace } = await params;
  const meta = WORKSPACE_META[workspace];
  if (!meta) return { title: "Not Found" };
  const url = `${BASE}/simulator/${workspace}`;
  return {
    title: meta.title,
    description: meta.description,
    keywords: [...meta.keywords, "axiom simulator", "axiom math", "open source mathematics"],
    alternates: { canonical: url },
    openGraph: {
      title: `${meta.title} — AXIOM`,
      description: meta.description,
      url,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${meta.title} — AXIOM`,
      description: meta.description,
    },
  };
}

export default async function WorkspacePage({ params }: Props) {
  const { workspace } = await params;
  const initialMode = SEGMENT_TO_MODE[workspace] as AppMode | undefined;
  if (!initialMode) notFound();
  return <SimulatorView initialMode={initialMode} />;
}
