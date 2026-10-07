# Thermal Lab Workspace Implementation Plan

## WHAT?
Create a new "Thermal Lab" workspace for simulating heat diffusion (2D heat equation) with interactive controls for thermal diffusivity, boundary conditions, and initial conditions.

## WHY?
To extend Axiom's simulation capabilities to include thermal physics, complementing existing mathematical and scientific workspaces. The Thermal Lab will provide an interactive way to explore heat transfer phenomena, which is a fundamental topic in physics and engineering.

## HOW?
1. Add "thermal" to the workspace metadata (WORKSPACE_META) in `/app/simulator/[workspace]/page.tsx`
2. Add "thermal" to SEGMENT_TO_MODE and MODE_TO_SEGMENT mappings in `/simulator/routes.ts`
3. Add "thermal" to the AppMode union type in `/simulator/store.ts`
4. Create a new 2D heat equation solver in `/simulator/mathlab/pde/heat2d.ts` (extending the existing 1D solver pattern)
5. Create a ThermalWorkspace component in `/simulator/components/thermal/ThermalWorkspace.tsx` (following the FractalWorkspace pattern)
6. Add the thermal view to the App component's switch statement in `/simulator/App.tsx`
7. Create basic controls for adjusting simulation parameters (alpha, boundary conditions, initial condition selector)

## WHERE?
- Routes: `/simulator/thermal` (maps to AppMode "thermal")
- Source: `/simulator/components/thermal/`
- Math: `/simulator/mathlab/pde/heat2d.ts`
- UI: Reuses existing WorkspaceShell, CanvasControls patterns

## RISKS?
- Numerical stability: 2D explicit heat equation has stricter stability condition (r ≤ 1/4) than 1D
- Performance: 2D simulations are more computationally intensive than 1D
- Complexity: Managing 2D state and WebGL rendering adds complexity

## DEPENDENCIES?
- Existing mathlab/pde/grid.ts for grid utilities
- Existing mathlab/pde/types.ts for result interfaces
- Existing simulator/components/workspace/WorkspaceShell.tsx
- Existing simulator/components/fractal/FractalCanvas.tsx (for WebGL rendering pattern)
- Existing Zustand store for state management

## TESTS?
- Unit tests for heat2d solver (similar to heat1d.test.ts)
- Integration test verifying workspace loads and routes correctly
- Visual regression test for basic heat diffusion visualization
- Test numerical stability boundary conditions

## SECURITY?
- No special security gates required (security_required: false)
- No sensitive data handling
- No external API calls
- Content is purely computational/visualizational

## ACCEPTANCE CRITERIA:
1. Navigating to `/simulator/thermal` loads the Thermal Lab workspace
2. Workspace shows a canvas with heat diffusion visualization
3. Controls allow adjusting thermal diffusivity (alpha) parameter
4. Controls allow selecting preset initial conditions (e.g., hot center, hot edge)
5. Simulation runs stably for reasonable parameter values
6. Visualization updates in real-time as parameters change
7. Reset button restores default state
8. URL updates correctly when navigating to/from thermal workspace

## SIMPLE VS PROPOSED SOLUTION:
SIMPLE SOLUTION: 
- Extend existing 1D heat solver to 2D using simple finite differences
- Reuse FractalWorkspace UI pattern for controls and canvas
- Add basic controls for alpha and initial condition selection
- Use existing mathlab infrastructure

PROPOSED SOLUTION:
- Create new 2D explicit finite difference solver for heat equation
- Build ThermalWorkspace component following FractalWorkspace pattern
- Add parameter controls (alpha, boundary conditions, initial condition)
- Integrate with existing workspace routing system

RECOMMENDATION: PROPOSED SOLUTION (it is the simple solution - reusing existing patterns and infrastructure)

## PROPORTIONALITY:
PROPORTIONATE - The solution follows existing patterns, reuses infrastructure, and provides the minimum viable thermal lab that solves the core problem of simulating heat diffusion.

## BLOCKERS:
None - all required infrastructure exists and can be extended.

## RECOMMENDATION:
Implement the Thermal Lab workspace as described, starting with the routing and basic structure, then implementing the 2D heat solver, and finally building the UI component.

## NEXT_ACTION:
Delegate to Builder to implement steps 1-4 (routing updates and basic solver structure)
