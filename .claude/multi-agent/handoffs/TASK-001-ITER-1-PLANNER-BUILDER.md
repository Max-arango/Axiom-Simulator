# Handoff from Planner to Builder
## Task: TASK-001 - Implement Thermal Lab workspace for Axiom
## Iteration: 1
## From: Planner
## To: Builder

### Context
The Planner has completed analysis and planning for rebuilding the Thermal Lab workspace according to the 28 requirements. The detailed plan is available in PLAN.md.

### Key Decisions from Planning
1. Fix data contract to use proper Grid1D structure (xMin, xMax, nx)
2. Implement explicit time state starting at index 0
3. Maintain FTCS stability condition with proper defaults and safety margin
4. Add numerical stability indicator
5. Improve error handling to expose structured errors
6. Compute derived fields: gradient, gradient magnitude, Laplacian, heat flux
7. Separate FIELD and SIMULATION modes (keep SIMULATION as primary)
8. Enhance visualization with responsive canvas, proper rendering system, color scale
9. Add interactive features: probe, isotherms, gradient/heat flux vectors
10. Redesign UI with sidebar layout instead of overlay
11. Add comprehensive testing (analytical validation, physical tests, Laplacian test)
12. Ensure performance optimizations and code quality

### Implementation Requirements
Based on the plan in PLAN.md, implement the following:

#### Phase 1: Foundation Fixes
- Update ThermalWorkspace.tsx to use correct Grid1D contract (xMin/xMax/nx)
- Implement useState(0) for currentTimeIndex with proper clamping
- Set default parameters to ensure rx+ry < 0.5 with safety margin
- Add numerical stability indicator display
- Improve error handling to show structured errors

#### Phase 2: Thermal Field Model
- Add gradient computation (dT/dx, dT/dy) using finite differences
- Add gradient magnitude calculation
- Add Laplacian computation
- Add heat flux computation (q = -k∇T)
- Ensure these are computed from the temperature field

#### Phase 3: Visualization Enhancements
- Implement responsive canvas using ResizeObserver or existing Axiom strategy
- Upgrade rendering system to show temperature heatmap with proper color scale
- Add coordinate axes and domain visualization
- Implement temperature scale legend with min/max labels
- Add probe functionality to display point values on click
- Add isotherm visualization (contour lines)
- Add gradient vector visualization (arrows on decimated grid)
- Add heat flux vector visualization (arrows opposite to gradient)
- Add visual toggles for different visualization layers

#### Phase 4: UI/UX Redesign
- Implement sidebar layout similar to suggested design:
  - Header with workspace title and controls (RUN/RESET)
  - Left sidebar: FIELD/Simulation toggles, parameters (T(x,y), alpha, dt, grid, boundaries, material)
  - Main canvas area: Thermal field visualization
  - Bottom analysis panel: ∇T, |∇T|, ∇²T, heat flux readings
- Ensure mobile responsiveness (collapse sidebar on mobile)
- Prevent UI from covering the visualization

#### Phase 5: Testing & Validation
- Create analytical validation test in heat2d.test.ts using sin(pi*x)sin(pi*y) solution
- Add physical tests for stable/unstable simulation, boundary preservation, etc.
- Add Laplacian regression test using T(x,y)=x²+y²
- Ensure all tests pass

#### Phase 6: Performance & Code Quality
- Avoid recomputing full simulation when only displayed time frame changes
- Keep existing MAX_CELLS safety limit
- Clean up TypeScript (proper React types, remove dead state/imports/comments)
- Ensure no fake physics - all visualizations derive from actual mathematical quantities
- Prevent over-engineering (stick to 2D, constant k, explicit FTCS for MVP)

### Acceptance Criteria to Verify
(From PLAN.md and original requirements)
- Page loads successfully
- Default state works correctly
- Time starts at 0 (t=0)
- Play/pause/reset functionality works
- Grid controls work properly
- Alpha and dt controls work
- Numerical instability is properly explained (not hidden)
- Temperature field renders correctly
- Scale legend renders with visible labels
- Coordinate domain is visible
- Probe functionality works (click to inspect point values)
- Gradient visualization works
- Gradient magnitude works
- Laplacian works
- Heat flux works
- Isotherms work
- Analytical validation test exists and passes
- Numerical tests for heat2d exist and pass
- No NaN or Infinity values
- Responsive canvas (adjusts to viewport)
- Lint passes
- Typecheck passes
- All tests pass
- Production build passes

### Live Constraints
- Do NOT modify Grid1D contract - UI must conform to existing mathematical model
- Do NOT create duplicate parser or math engine
- Do NOT use eval()
- Do NOT introduce unnecessary dependencies
- Reuse existing AST, parser, evaluator, differentiation, gradient, Laplacian, units, plot infrastructure, state management, existing rendering infrastructure
- Separate FIELD and SIMULATION modes clearly
- Implement FTCS solver with stability condition rx+ry <= 0.5
- Provide visualization: temperature heatmap, isotherms, gradient vectors, heat flux vectors, coordinate axes, temperature legend, probe
- Use explicit state for currentTimeIndex starting at 0
- Fix Grid1D contract usage: use xMin, xMax, nx instead of min, max, steps
- Implement proper error handling with structured errors
- Add numerical stability indicator
- Implement analytical validation for 2D solver
- Ensure responsive canvas using ResizeObserver or existing strategy
- Follow UI layout similar to suggested design with sidebar and main canvas
- Use existing Axiom styling and color scales
- Add unit support for dimensional mode or label as dimensionless if inputs are dimensionless
- Implement gradient, gradient magnitude, Laplacian, heat flux, isotherms
- Ensure no fake physics: all visualizations derive from actual mathematical quantities

### Expected Output
After implementation, the Builder should provide a handoff to the Optimizer containing:
1. Modified source files implementing the above requirements
2. Summary of changes made
3. Any issues encountered or decisions made during implementation
4. Ready state for optimization phase

### Micro-Ritual for Builder
**OBJECTIVE**: Implement the Thermal Lab workspace rebuild according to the planner's specifications, ensuring mathematical correctness and architectural consistency.
**LIVE CONSTRAINT**: Do not modify Grid1D contract; implementation must conform to the existing mathematical model.
**USER WILL FIRST CHECK**: That the implementation addresses all foundation fixes and begins to implement the thermal field model correctly.
