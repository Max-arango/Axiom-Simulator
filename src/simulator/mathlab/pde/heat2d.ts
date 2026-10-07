// 2D heat / diffusion equation  u_t = α · (u_xx + u_yy) by the explicit FTCS scheme
// (Forward-Time, Centred-Space) on a uniform rectangular grid with Dirichlet boundaries.
//
//   u[n+1][i][j] = u[n][i][j] + rx·(u[n][i+1][j] − 2·u[n][i][j] + u[n][i-1][j])
//                         + ry·(u[n][i][j+1] − 2·u[n][i][j] + u[n][i][j-1])
//   where rx = α·dt/dx², ry = α·dt/dy²
//
// STABILITY (spec §27, the core discipline). Von-Neumann analysis gives the hard
// bound rx + ry ≤ 1/2: above it FTCS AMPLIFIES the shortest wavelength every step and the
// grid blows up — a result that is not merely inaccurate but qualitatively false
// (oscillates, diverges). Because there is no "slightly-wrong-but-usable" regime
// past 1/2, this solver REFUSES: rx + ry > 1/2 throws NumericalInstabilityError naming
// rx+ry and the limit, rather than returning garbage flagged stable:false. Returned
// results therefore always carry stable:true (and rx+ry ≤ 1/2 keeps the discrete
// maximum principle, so the interior never exceeds its initial/boundary extremes).
//
// This is a foundation, not a library: explicit-only (no Crank–Nicolson/implicit),
// Dirichlet-only, constant α, 2D. Implicit schemes lift the rx+ry ≤ 1/2 shackle but need
// a linear solve per step — out of scope here.
import { InvalidInputError, NumericalInstabilityError, ResourceLimitError } from "../core/errors.ts";
import { buildGrid, MAX_CELLS } from "./grid.ts";
import type { Grid1D } from "./types.ts";

export interface Heat2DParams {
  /** Grid in x direction (including both boundaries). */
  gridX: Grid1D;
  /** Grid in y direction (including both boundaries). */
  gridY: Grid1D;
  alpha: number; // thermal diffusivity α > 0
  dt: number; // time step > 0
  steps: number; // number of time steps (result has steps+1 time rows)
  initial: (x: number, y: number) => number; // u(x, y, 0) on the interior
  boundary: {
    bottom: number | ((x: number) => number); // y = yMin
    top: number | ((x: number) => number); // y = yMax
    left: number | ((y: number) => number); // x = xMin
    right: number | ((y: number) => number); // x = xMax
  }; // Dirichlet values, held fixed ∀ t
}

/** Result of a 2D time-marching finite-difference solve. u[timeIndex][xIndex][yIndex]. */
export interface Heat2DResult {
  x: number[]; // spatial grid in x, length nx, x[0]=xMin … x[nx-1]=xMax (uniform)
  y: number[]; // spatial grid in y, length ny, y[0]=yMin … y[ny-1]=yMax (uniform)
  t: number[]; // time samples, length steps+1, t[0]=0 … t[steps]=steps·dt
  u: number[][][]; // solution volume: u[n] is the slice at time t[n], length nx × ny
  method: string; // scheme identifier, always "FTCS"
  stable: boolean; // did the run stay inside the scheme's stability region?
  stabilityNumber: number; // rx + ry = α·dt·(1/dx² + 1/dy²)
  warnings: string[];
}

export function heat2d(p: Heat2DParams): Heat2DResult {
  const { gridX, gridY, alpha, dt, steps, initial, boundary } = p;
  if (!(alpha > 0) || !Number.isFinite(alpha)) throw new InvalidInputError(`alpha must be > 0 (got ${alpha})`);
  if (!(dt > 0) || !Number.isFinite(dt)) throw new InvalidInputError(`dt must be > 0 (got ${dt})`);
  if (!Number.isInteger(steps) || steps < 1) throw new InvalidInputError(`steps must be a positive integer (got ${steps})`);

  const x = buildGrid(gridX);
  const y = buildGrid(gridY);
  const nx = x.length;
  const ny = y.length;
  if ((steps + 1) * nx * ny > MAX_CELLS) {
    throw new ResourceLimitError(`space-time grid ${steps + 1}×${nx}×${ny} exceeds MAX_CELLS=${MAX_CELLS}; reduce steps or nx/ny`);
  }

  const dx = x[1] - x[0];
  const dy = y[1] - y[0];
  const rx = (alpha * dt) / (dx * dx); // diffusion number in x
  const ry = (alpha * dt) / (dy * dy); // diffusion number in y
  const rSum = rx + ry;
  if (rSum > 0.5) {
    throw new NumericalInstabilityError(
      `FTCS heat scheme is unstable for rx+ry=${rSum.toExponential(3)} > 0.5 (rx = α·dt/dx², ry = α·dt/dy²); ` +
        `reduce dt below ${(0.5 * (dx*dx) * (dy*dy) / (alpha * ((dy*dy) + (dx*dx)))).toExponential(3)} or coarsen the grid`,
    );
  }

  // Helper to convert boundary spec to function
  const asFn = (b: number | ((coord: number) => number)) =>
    typeof b === "number" ? () => b : b;
  const [bottomFn, topFn, leftFn, rightFn] = [
    asFn(boundary.bottom),
    asFn(boundary.top),
    asFn(boundary.left),
    asFn(boundary.right),
  ];

  // t=0 slice: interior from the initial condition, boundary nodes from Dirichlet.
  const u0: number[][] = [];
  for (let i = 0; i < nx; i++) {
    const row: number[] = [];
    for (let j = 0; j < ny; j++) {
      if (i === 0) {
        // left edge
        row[j] = leftFn(y[j]);
      } else if (i === nx - 1) {
        // right edge
        row[j] = rightFn(y[j]);
      } else if (j === 0) {
        // bottom edge
        row[j] = bottomFn(x[i]);
      } else if (j === ny - 1) {
        // top edge
        row[j] = topFn(x[i]);
      } else {
        // interior
        row[j] = initial(x[i], y[j]);
      }
    }
    u0.push(row);
  }
  // Validate finiteness
  for (let i = 0; i < nx; i++) {
    for (let j = 0; j < ny; j++) {
      if (!Number.isFinite(u0[i][j])) {
        throw new InvalidInputError("initial or boundary produced a non-finite value");
      }
    }
  }

  const t: number[] = new Array(steps + 1);
  t[0] = 0;
  const u: number[][][] = [u0];
  let cur = u0;

  for (let n = 0; n < steps; n++) {
    const next: number[][] = [];
    for (let i = 0; i < nx; i++) {
      const row: number[] = [];
      for (let j = 0; j < ny; j++) {
        if (i === 0) {
          // left edge, held fixed
          row[j] = leftFn(y[j]);
        } else if (i === nx - 1) {
          // right edge, held fixed
          row[j] = rightFn(y[j]);
        } else if (j === 0) {
          // bottom edge, held fixed
          row[j] = bottomFn(x[i]);
        } else if (j === ny - 1) {
          // top edge, held fixed
          row[j] = topFn(x[i]);
        } else {
          // interior point
          const xi = cur[i][j];
          const xi_xp1 = cur[i + 1][j];
          const xi_xm1 = cur[i - 1][j];
          const xi_yp1 = cur[i][j + 1];
          const xi_ym1 = cur[i][j - 1];
          row[j] =
            xi +
            rx * (xi_xp1 - 2 * xi + xi_xm1) +
            ry * (xi_yp1 - 2 * xi + xi_ym1);
        }
      }
      next.push(row);
    }
    cur = next;
    u.push(next);
    t[n + 1] = (n + 1) * dt;
  }

  return {
    x,
    y,
    t,
    u,
    method: "FTCS",
    stable: true,
    stabilityNumber: rSum,
    warnings: [],
  };
}