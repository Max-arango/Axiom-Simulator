# Thermal Lab Rebuild Plan

## Overview
This plan outlines the systematic rebuild of the Thermal Lab workspace to meet all 28 requirements from the audit, prioritizing mathematical correctness, numerical stability, and architectural consistency.

## Critical Files to Modify
- `src/simulator/components/thermal/ThermalWorkspace.tsx` - Main component
- `src/simulator/mathlab/pde/heat2d.ts` - Solver (minimal changes, mostly usage)
- `src/simulator/mathlab/pde/heat2d.test.ts` - Analytical validation and physical tests

## Implementation Phases

### Phase 1: Foundation Fixes
1. **Data Contract Compliance**
   - Replace all `gridX.min/max/steps` with `gridX.xMin/xMax/nx`
   - Replace all `gridY.min/max/steps` with `gridY.xMin/xMax/nx`
   - Ensure ThermalWorkspace uses exact Grid1D structure

2. **Time State Management**
   - Implement `const [currentTimeIndex, setCurrentTimeIndex] = useState(0)`
   - Ensure simulation starts at t=0, time index=0
   - Add clamping logic when simulation parameters change
   - Fix playback to go 0→1→2→...→N

3. **Numerical Stability & Defaults**
   - Keep FTCS stability check: rx + ry <= 0.5
   - Calculate dx, dy properly from grid dimensions
   - Set default parameters to produce rx+ry < 0.5 with safety margin
   - Add numerical stability indicator (STABLE/WARNING/UNSTABLE)
   - Display rx, ry, rx+ry, maximum stable dt, current dt

4. **Error Handling**
   - Never wrap errors in generic "Simulation error"
   - Expose actual structured errors (NumericalInstabilityError, etc.)
   - Improve SimulationErrorDisplay to show detailed error info

### Phase 2: Thermal Field Model
5. **Derived Fields Computation**
   - Add functions to compute:
     - Gradient: ∇T = (dT/dx, dT/dy) using finite differences
     - Gradient magnitude: |∇T|
     - Laplacian: ∇²T 
     - Heat flux: q = -k∇T (assuming constant isotropic k=1 for now)
   - Compute these from the temperature field T(x,y,t)

6. **FIELD vs SIMULATION Mode Separation**
   - Keep SIMULATION mode as primary (user provides initial condition, boundary conditions, alpha, dt)
   - Prepare infrastructure for FIELD mode (user provides T(x,y)) for future extension

### Phase 3: Visualization Enhancements
7. **Canvas Improvements**
   - Remove fixed 800x600 size
   - Implement responsive canvas using ResizeObserver (already partially implemented)
   - Use devicePixelRatio for HiDPI displays
   - Ensure canvas fits workspace viewport

8. **Rendering System Overhaul**
   - Replace primitive heatmap with comprehensive visualization:
     - Temperature heatmap (base layer)
     - Optional isotherms (contour lines T(x,y)=C)
     - Optional gradient vectors (arrows on decimated grid)
     - Optional heat-flux vectors (arrows opposite gradient)
     - Coordinate axes with labels
     - Temperature scale legend with min/max labels
     - Probe point (shows values on click)

9. **Color Scale**
   - Replace simple rgb(red,0,blue) with perceptually useful continuous mapping
   - Preserve numerical meaning: cold < hot
   - Add visible scale labels: min ... max

### Phase 4: Interactive Features
10. **Probe Functionality**
    - On canvas click/tap, show:
      - x, y coordinates
      - T temperature
      - dT/dx, dT/dy gradient components
      - |∇T| gradient magnitude
      - qx, qy heat flux components
      - |q| heat flux magnitude
    - Make numbers update live as simulation progresses

11. **Isotherms (Contour Visualization)**
    - Implement T(x,y)=C contour lines
    - Reuse existing contour infrastructure if available in Axiom
    - Do not draw arbitrary lines

12. **Gradient & Heat Flux Vectors**
    - Render ∇T as arrows on decimated grid (every 4th/5th/6th point)
    - Normalize vector rendering separately from numerical magnitude
    - For heat flux: q = -k∇T (arrows opposite temperature gradient)
    - Provide toggle: Gradient vs Heat Flux

### Phase 5: UI/UX Redesign
13. **Layout Redesign**
    - Implement sidebar layout similar to:
      ```
      ┌──────────────────────────────────────────────────┐
      │ THERMAL LAB                         RUN  RESET   │
      ├───────────────┬──────────────────────────────────┤
      │ FIELD         │                                  │
      │ Simulation    │                                  │
      │               │         THERMAL FIELD            │
      │ T(x,y)        │                                  │
      │ alpha         │            CANVAS                │
      │ dt            │                                  │
      │ grid          │                                  │
      │ boundaries    │                                  │
      │ material      │                                  │
      │               │                                  │
      ├───────────────┤                                  │
      │ ANALYSIS      │                                  │
      │               │                                  │
      │ ∇T            │                                  │
      │ |∇T|          │                                  │
      │ ∇²T           │                                  │
      │ heat flux     │                                  │
      └───────────────┴──────────────────────────────────┘
      ```
    - On mobile, collapse sidebar
    - Do not cover graph with controls

### Phase 6: Testing & Validation
14. **Analytical Validation**
    - Create src/simulator/mathlab/pde/heat2d.test.ts (enhance existing)
    - Use analytical 2D solution:
      - Domain: [0,1]×[0,1] with zero Dirichlet boundaries
      - Initial: T(x,y,0)=sin(πx)sin(πy)
      - Exact: T(x,y,t)=exp(-2π²αt)sin(πx)sin(πy)
    - Test relative/absolute error against analytical solution

15. **Physical Tests**
    - Stable/unstable simulation behavior
    - Exact stability boundary
    - Boundary preservation
    - Diffusion monotonicity
    - Hotspot cooling (max temp never increases when stable)
    - Dimensions, finite values, resource limits

16. **Laplacian Test**
    - Validate T(x,y)=x²+y²
    - Gradient: (2x,2y)
    - Laplacian: 4
    - Use as regression test if field-analysis code shared

### Phase 7: Performance & Code Quality
17. **Performance Optimization**
    - Do not recompute full simulation when only displayed time frame changes
    - Simulation parameters change → recompute solver
    - Current time index changes → rerender existing data
    - Visualization toggles change → recompute only derived render data

18. **Memory Management**
    - Keep existing MAX_CELLS safety limit
    - Current solver stores u[time][x][y] - acceptable for now

19. **TypeScript Cleanup**
    - Use proper React types: React.Dispatch<React.SetStateAction<Heat2DParams>>
    - Remove dead state, dead imports, obsolete comments
    - Fix useCallback/useMemo dependencies

20. **Code Quality**
    - Ensure no fake physics (every visualization from actual math)
    - No over-engineering (stick to 2D, linear, constant properties)
    - Maintain existing Axiom styling and patterns

## Validation Steps
After implementation, run:
1. `npm test` - all tests pass
2. `npm run lint` - lint passes
3. `npx tsc --noEmit` - TypeScript compiles
4. `npm run build` - production build passes

## Risk Mitigation
- Preserve existing PDE infrastructure (grid.ts, types.ts, heat1d.ts, laplace2d.ts)
- Do not modify Grid1D contract - UI adapts to it
- No eval(), no unnecessary dependencies
- Keep changes focused and minimal where possible
- Reuse existing Axiom patterns for canvas, styling, state management

## Dependencies
All work uses existing codebase dependencies. No new packages required.

## Estimated Effort
This is a comprehensive rewrite requiring careful attention to mathematical correctness. Estimated as a major feature implementation.
