# TASK-001: Implement Thermal Lab workspace for Axiom

status: IN_PROGRESS
iteration: 1
pipeline: Planner(done) → Builder(done) → Optimizer(done) → QA(active) → AppSec → Red Team → Orchestrator

## Summary
Implement Thermal Lab workspace for Axiom Simulator as per the detailed requirements in the task description.

## Acceptance criteria
(See task file for full list)

## Key decisions (from analysis)
- Reuse existing AST, parser, evaluator, differentiation, gradient, Laplacian, units, plot infrastructure, state management, existing rendering infrastructure.
- Do not create duplicate parser, duplicate math engine, eval(), physics hidden inside components, React-dependent solver, magic constants, fake physical behavior.
- Separate FIELD and SIMULATION modes.
- Implement FTCS solver for transient mode with stability condition rx+ry <= 0.5.
- Provide visualization: temperature heatmap, isotherms, gradient vectors, heat flux vectors, coordinate axes, temperature legend, probe.
- Use explicit state for currentTimeIndex starting at 0.
- Fix Grid1D contract usage: use xMin, xMax, nx instead of min, max, steps.
- Implement proper error handling with structured errors.
- Add numerical stability indicator.
- Implement analytical validation for 2D solver.
- Ensure responsive canvas using ResizeObserver or existing strategy.
- Kingdom UI similar to suggested layout with sidebar and main canvas.
- Use existing Axiom styling and color scales.
- Add unit support for dimensional mode (K, °C, m, W/(m·K), W/m², etc.) or label as dimensionless if inputs are dimensionless.
- Implement gradient, gradient magnitude, Laplacian, heat flux, isotherms.
- Ensure no fake physics: all visualizations derive from actual mathematical quantities.

## Handoffs
- Planner → Builder: See .claude/multi-agent/handoffs/TASK-001-ITER-1-PLANNER-BUILDER.md
- Builder → Optimizer: See .claude/multi-agent/handoffs/TASK-001-ITER-1-BUILDER-OPTIMIZER.md
- Optimizer → QA: See .claude/multi-agent/handoffs/TASK-001-ITER-1-OPTIMIZER-QA.md
