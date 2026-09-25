# Axiom Simulator

Interactive mathematical playground built with Next.js 16, React 19, and TypeScript. One shared math engine powers ten live workspaces — no duplicated evaluation logic, no `eval()`.

## Workspaces

| # | Workspace | Description |
|---|-----------|-------------|
| 01 | **Calculator** | 2D & 3D graphing with symbolic differentiation |
| 02 | **Fractal Lab** | GPU-accelerated fractals via AST→GLSL compilation |
| 03 | **Bloch Sphere** | Single-qubit state visualization |
| 04 | **4D** | Tesseract and polytope projections |
| 05 | **Topology** | Shape deformation and homeomorphisms |
| 06 | **Dynamics** | Phase portraits and ODE solvers |
| 07 | **Game of Life** | Conway's cellular automaton — emergent complexity from four rules |
| 08 | **Inspector** | AST structure analysis and symbolic decomposition |
| 09 | **Notebook** | Reproducible mathematical experiments |
| 10 | **Docs** | Bilingual mathematical reference (en/es) |

## Game of Life

Full Conway's Game of Life implementation with:

- **Engine** — `Uint8Array` double-buffer, O(W×H) per generation, seeded LCG randomize
- **Patterns** — 12 built-in patterns: still lifes (Block, Beehive, Loaf, Boat), oscillators (Blinker, Toad, Beacon, Pulsar), spaceships (Glider, LWSS), and Gosper Glider Gun
- **Canvas renderer** — requestAnimationFrame loop, glow pass, rounded cells, viewport culling, zoom/pan (scroll + middle mouse + space+drag), ghost pattern preview
- **Controls** — play/pause/step/reset/clear/randomize, speed presets (1×–50×), grid resize, fit-to-screen
- **Stats** — real-time generation, population, births, deaths, density; population history graph (recharts)
- **Keyboard** — Space (play/pause), N (step), R (reset), C (clear), Escape (cancel pattern)

## Tech Stack

- **Framework** — Next.js 16 (App Router), React 19
- **Language** — TypeScript 5
- **Styling** — Tailwind CSS v4
- **State** — Zustand 5 (separate store per domain)
- **Math engine** — custom lexer → parser → AST → evaluator (no `eval()`)
- **Rendering** — Canvas 2D, WebGL (fractals), recharts (graphs)
- **Testing** — Vitest 3 (1627 tests)
- **Deploy** — Vercel (landing) + systemd user units (simulator)

## Development

```bash
bun install
bun dev          # landing: localhost:3000
bun run sim      # simulator: localhost:5173
bun test         # run all tests
```

## Architecture

```
src/
├── app/                    # Next.js App Router (landing)
├── components/             # Landing UI components
│   ├── landing/            # Section components
│   └── math/               # Mathematical exhibit components
├── data/                   # Workspace metadata
└── simulator/              # Vite + React simulator app
    ├── life/               # Game of Life engine, store, patterns
    │   ├── engine.ts       # Pure TS GoL engine (no React)
    │   ├── engine.test.ts  # 15 vitest tests
    │   ├── patterns.ts     # 12 built-in patterns
    │   └── store.ts        # Zustand store + module-level singleton
    ├── components/
    │   └── life/           # LifeView, LifeCanvas, LifePanel, PopGraph
    └── mathlab/            # Other workspace engines
```
