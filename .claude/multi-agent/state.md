# MAE State — AXIOM Quantum Lab

**Task:** New "Quantum Lab" module in the in-app simulator — interactive up-to-6-qubit
quantum circuit simulator. Correctness > architecture > UX > viz > effects.

**Target app:** `Mathematics-landing` (name: axiom). Module root: `src/simulator/quantum/`.

## Locked decisions
- Editor interaction: **click-to-place** (palette click → cell click; click placed gate → inspect/delete). @dnd-kit deferred.
- Execution: **checkpoint after engine** — build+QA phases 1–3, prove with tests, stop for approval before UI.
- Engine is React-free (`quantum/`), pure. UI in `components/quantum/`. Own zustand store `quantumStore.ts`.

## Reuse (from audit)
- `mathlab/complex/complex.ts` — Complex{re,im} + full ops. All amplitude math. DO NOT reimplement.
- `mathlab/core/rng.ts` — seeded RNG for deterministic shot sampling/tests.
- `bloch/components/blochGeo.ts` + `graph/mat4.ts` — sphere geometry + camera.
- Vitest, node env, colocated `*.test.ts` under `src/simulator/`, `toBeCloseTo(x,6)`. Run: `npx vitest run <path>`.
- KaTeX `tex()` (notebook/notebookRender.ts). Laboratory palette tokens (globals.css). Raw-element + inline-Tailwind idiom (NOT shadcn in simulator).

## Refactor (backward-compatible, later)
- `components/bloch/BlochSphere.tsx`: add optional props (vec, trajectory) overriding `useBloch` store when passed. Existing single-qubit BlochView must keep working (req #21).

## Engine design (phases 1-3)
- State: `StateVector = Complex[]` length 2^n. Gates applied by bit-iteration (no kron matrices).
- Single gates = 2×2 complex matrices. Controlled = base 2×2 applied on control-mask. SWAP = index swap. CCX = 2-control mask.
- Gates: I X Y Z H S Sdg T Tdg RX RY RZ PHASE ; CX CZ SWAP CCX ; M (measure marker).
- density.ts: partial trace → 2×2 reduced ρ per qubit → Bloch (2Re ρ01, -2Im ρ01, ρ00-ρ11) + von Neumann entropy (2×2 closed form).
- circuit.ts: Operation{gate,qubits,params?}; Circuit{qubits,ops[]} (ordered flat list; UI columns map to order). validate() + JSON import/export.
- algorithms.ts: superposition, Bell, GHZ, teleport, Deutsch-Jozsa, Grover as circuit JSON.

## Wiring (later, phase 4)
AppMode union (`store.ts:21`), App.tsx tab+render (lazy), HomeView WORKSPACES card, mathSearch (optional).

## Phase status
- [x] P1 gates+statevector (Builder A) — 41 tests. API frozen. Little-endian: qubit i=bit i, controlled qubits=[...controls,target].
- [x] P2a simulator+measurement (Builder B) — 12 tests. runCircuit/runSteps/stateAtStep; measureQubit/measureAll/sampleShots (seeded). Display bitstring MSB-left (qubit n-1 first); measureAll.bits little-endian.
- [x] P2b density+entropy (Builder C) — 11 tests. reducedDensity/blochVector(y=-2Imρ01)/purity/vonNeumannEntropy(bits)/isEntangled/blochOf.
- [x] P3 circuit+validation+JSON+algorithms (Builder D) — 19 tests. validate (friendly msgs), toExport/fromExport/serialize/deserialize (trust boundary), toText; ALGORITHMS[superposition,bell,ghz,teleportation,deutschJozsa,grover], getAlgorithm.
- [x] QA gate — PASS. Quantum 83 tests. Full simulator regression 1399 tests (109 files), 0 breakage. QA adversarial probes (30 asserts: endianness cross-module, gate phases, CZ/CX/CCX/SWAP truth, Bell/GHZ entanglement, shot convergence, trust boundary) all pass, 0 bugs. Probes removed.
- [ ] CHECKPOINT: awaiting user approval to build UI (P4-9). <-- HERE

## Production gate @ engine checkpoint
Decision: CONTINUE to UI. Blockers: 0. CRITICAL/HIGH: 0. Evidence: vitest 83 + 1399 green. USER APPROVED P4-9.

## UI phase (P4-9) status
Base done: quantumStore.ts (13 tests, contract pinned) + gateDocs.ts (18 entries, 5 tests).
Store contract: useQuantum + helpers toCircuit/columnCount/stateAfterColumn/currentState/placementAt/validateCircuit. PlacedOp{id,gate,qubits,params?,column}. step k = after columns 0..k-1. Multi-qubit qubits=[...controls,target].
Bloch reuse decision: NEW QubitBloch.tsx reusing blochGeo.ts+mat4.ts (props-driven), BlochSphere.tsx/blochStore.ts UNTOUCHED (req #21).
Builders in flight (components/quantum/):
- G editor: GatePalette, CircuitGrid, PlaybackControls, QubitControls, gridCell(+test)
- H panels: StatePanel, MeasurementPanel, stateRows(+test), Bar
- I bloch: QubitBloch, BlochPanel, EntanglementPanel, entReport(+test)
- J io: GateInspector, LearnPanel, ExamplesPanel, ImportExportPanel
Remaining after builders: assemble QuantumLabView.tsx (WorkspaceShell) + wire app (AppMode union store.ts:21, App.tsx tab+render lazy, HomeView WORKSPACES card, mathSearch) + live dev-server verify + QA/AppSec gate.
Layout: WorkspaceShell({title,panel,children,panelWidth,toolbarActions,hud}). children=main dashboard, panel=palette+playback+controls.

## UI phase COMPLETE
Builders G/H/I/J hit session limit mid-run; salvaged from disk + orchestrator finished H (StatePanel/MeasurementPanel/stateRows) + assembly + wiring.
Delivered: 10 engine files + 15 UI components. QuantumLabView = own dashboard layout (left rail: QubitControls/GatePalette/PlaybackControls/ExamplesPanel/ImportExportPanel; main: CircuitGrid + tabbed panels Statevector/Medición/Bloch/Entrelazamiento/Inspector/Aprender).
Wired: store.ts AppMode "quantum", App.tsx tab+lazy render, HomeView card, mathSearch entry.
BlochSphere.tsx/blochStore.ts UNTOUCHED (req #21) — new QubitBloch reuses blochGeo+mat4.
vitest.config.ts: added css:{postcss:{plugins:[]}} so component render tests don't run app PostCSS in node (build unaffected).

## Gates run (P4-9)
- Tests: full simulator suite 1433 pass / 115 files (was 1399/109 → +34, 0 regression). Quantum module = 117 tests.
- Render smoke (react-dom/server): full view + all 8 panels render without throwing; StatePanel binds to statevector. NOTE zustand SSR returns creation-time snapshot → smoke sees initial state only.
- Dev server: GET /simulator = 200, no compile errors.
- AppSec spot-check: PASS 0 findings. Import→deserialize validates+throws (caught), no eval. dangerouslySetInnerHTML only injects tex()/escapeHtml of trusted gateDocs (not user input).

## Production gate @ final
Decision: TERMINATE (complete). Blockers 0. CRITICAL/HIGH 0. All 17 completion-criteria (§22) covered.
Browser verification: DONE. Playwright (playwright-core 1.63 via existing cached chromium-1228, executablePath) drove the real UI headless. 12/12 checks pass, 0 console/page errors:
home→lab, load Bell, step-to-end, statevector |00⟩/|11⟩ 50%, shots only 00/11, WebGL Bloch (2 canvases, Bell reduced ρ → vector at center |r|=0 pureza=0.5 entropía=1 bit + entangled note), entanglement panel, click-to-place single H, staged CX (control+target), inspector. Screenshots in scratchpad.
Housekeeping: package.json gained playwright devDep (used for verification; chromium auto-download is blocked in this env, used cached binary). vitest.config.ts gained css:{postcss:{plugins:[]}} for component render tests (build unaffected).

## Engine API (frozen — UI builds on this)
- statevector.ts: zeroState, applyMat2, applyControlled, applySwap, applyOperation, probabilities, norm2, normalize
- gates.ts: GATES: Record<GateId,GateSpec>, gateMatrix(id,params)
- simulator.ts: runCircuit, runSteps, stateAtStep
- measurement.ts: bitstring, probabilityOfOutcome, measureQubit, measureAll, sampleShots
- density.ts: Density2, reducedDensity, blochVector, purity, vonNeumannEntropy, isEntangled, blochOf
- circuit.ts: emptyCircuit, validate, toExport/fromExport, serialize/deserialize, toText, CircuitExport
- algorithms.ts: ALGORITHMS, getAlgorithm, PresetSpec
- Export JSON schema: { qubits, operations:[{gate,qubits,params?}] }

## Known notes
- tsc --noEmit flags TS5097 on `.ts` import extensions — PRE-EXISTING repo-wide convention (existing simulator imports `.ts`); vitest is the real gate and is green. Config fix (allowImportingTsExtensions) only if a clean standalone tsc gate is ever wanted.
- stateAtStep recomputes runSteps O(steps) per call — fine for step UI; memoize only if hot.
