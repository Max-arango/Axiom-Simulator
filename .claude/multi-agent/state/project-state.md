language: TypeScript/JavaScript
package_manager: npm
test_command: vitest run
lint_command: eslint .
build_command: prisma generate && next build && cp -r .next/static .next/standalone/.next/ && cp -r public .next/standalone/
git_branch: main
git_status: clean
last_commits: e60c65d Fix Thermal Lab: stable defaults, proper error handling, Grid1D contract, responsive canvas
708ee77 I dunno what to put rigth here
289a6a4 fix: add missing heat2d.ts module for thermal simulator
11c2fb8 fix: use @ alias for CanvasControls import in ThermalWorkspace
d11caf4 fix: use @ alias for heat2d imports in ThermalWorkspace
