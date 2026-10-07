# TASK-001: Conway's Game of Life — Axiom Simulator Integration

status: IN_PROGRESS
iteration: 1
pipeline: Planner(done) → Builder(active) → QA → Orchestrator

## Summary
Implement Conway's Game of Life as a new workspace "life" inside the Axiom Simulator SPA.

## Acceptance criteria
- [ ] Engine: correct GoL rules, Uint8Array double-buffer, O(W×H) per gen
- [ ] Patterns: Block, Beehive, Loaf, Boat, Blinker, Toad, Beacon, Pulsar, Glider, LWSS, Gosper Gun
- [ ] Store: Zustand, running/speed/generation/population/births/deaths/history
- [ ] Canvas: 2D canvas, play/pause/step/reset/clear/randomize, zoom/pan, click-to-toggle, right-click-erase
- [ ] Panel: controls, pattern library, stats, population graph
- [ ] Integration: AppMode "life", nav tab, search entry
- [ ] Tests: vitest, block/blinker/glider/birth/survival/death/simultaneity
- [ ] Build passes: lint + typecheck + tests

## Key decisions (from analysis)
- AppMode union extended with "life"
- Lazy-loaded LifeView like QuantumLabView
- QuantumLabView-style layout: left sidebar + canvas right
- WorkspaceShell NOT used (canvas needs different zoom/pan model)
- Zustand store + module-level engine singleton (cells NOT in React state)
- Canvas reads engine.cells directly, rerenders on renderTick signal
- Simulation driver: useEffect with setInterval based on speed
- Rendering: ctx.fillRect per alive cell (< 50k cells), ImageData for larger
- Color: vermilion cells on void background
- recharts for population graph (already installed)
