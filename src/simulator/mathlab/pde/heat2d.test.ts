import { describe, it, expect } from "vitest";
import { heat2d } from "./heat2d.ts";
import { NumericalInstabilityError, InvalidInputError, ResourceLimitError } from "../core/errors.ts";
import type { Grid1D } from "./types.ts";

// Cross-validation against the ANALYTICAL solution (spec §69/§70), never against
// hardcoded solver output. On [0,1]×[0,1] with u(x,y,0)=sin(πx)sin(πy), Dirichlet 0
// on all boundaries and α=1, the exact solution is
// u(x,y,t) = e^{-2π²t}·sin(πx)sin(πy) (a single decaying Fourier mode).
const unitSquare: Grid1D = { xMin: 0, xMax: 1, nx: 21 }; // dx = 0.05
const sinMode2D = (x: number, y: number) => Math.sin(Math.PI * x) * Math.sin(Math.PI * y);
const exact2D = (x: number, y: number, t: number) =>
  Math.exp(-2 * Math.PI * Math.PI * t) * Math.sin(Math.PI * x) * Math.sin(Math.PI * y);
const maxAbs2D = (a: number[][]) =>
  a.reduce((m, row) => Math.max(m, row.reduce((mm, v) => Math.max(mm, Math.abs(v)), 0)), 0);

describe("heat2d — FTCS vs analytical e^{-2π²t}·sin(πx)sin(πy)", () => {
  it("matches the analytical profile to < 1% of peak at t=0.1 (rx+ry=0.4)", () => {
    // dx = dy = 0.05, alpha = 1, dt = 0.001 => rx = ry = 0.4, rx+ry = 0.8 > 0.5 UNSTABLE!
    // Need dt such that rx+ry <= 0.5. With dx=dy=0.05, 1/dx^2 = 400.
    // rx+ry = alpha*dt*(1/dx^2 + 1/dy^2) = 1*dt*800 <= 0.5 => dt <= 0.5/800 = 0.000625
    // For rx+ry = 0.4: dt = 0.4/800 = 0.0005
    const dt = 0.0005; // rx = ry = 0.2, rx+ry = 0.4
    const steps = 200; // t = 0.1
    const r = heat2d({
      gridX: unitSquare,
      gridY: unitSquare,
      alpha: 1,
      dt,
      steps,
      initial: sinMode2D,
      boundary: { bottom: 0, top: 0, left: 0, right: 0 },
    });
    expect(r.stabilityNumber).toBeCloseTo(0.4, 12);
    const tEnd = r.t[r.t.length - 1];
    expect(tEnd).toBeCloseTo(0.1, 12);
    const num = r.u[r.u.length - 1];
    let err = 0;
    for (let i = 0; i < r.x.length; i++) {
      for (let j = 0; j < r.y.length; j++) {
        const e = Math.abs(num[i][j] - exact2D(r.x[i], r.y[j], tEnd));
        if (e > err) err = e;
      }
    }
    // Peak analytical value at tEnd is e^{-2π²·0.1}·1 ≈ 0.138; assert error well under 1% of it.
    expect(err).toBeLessThan(1.5e-3);
  });

  it("carries the right result shape (method, stable, dimensions)", () => {
    const r = heat2d({
      gridX: unitSquare,
      gridY: unitSquare,
      alpha: 1,
      dt: 0.0005,
      steps: 10,
      initial: sinMode2D,
      boundary: { bottom: 0, top: 0, left: 0, right: 0 },
    });
    expect(r.method).toBe("FTCS");
    expect(r.stable).toBe(true);
    expect(r.warnings).toEqual([]);
    expect(r.u.length).toBe(11); // steps + 1 rows
    expect(r.t.length).toBe(11);
    expect(r.x.length).toBe(21);
    expect(r.y.length).toBe(21);
    expect(r.u.every((slice) => slice.length === 21)).toBe(true);
    expect(r.u.every((slice) => slice.every((row) => row.length === 21))).toBe(true);
  });
});

describe("heat2d — stability discipline (spec §27, refuse above rx+ry=1/2)", () => {
  it("throws NumericalInstabilityError when rx+ry > 0.5", () => {
    // dx = dy = 0.05, alpha = 1, dt = 0.001 => rx = ry = 0.4, rx+ry = 0.8 > 0.5
    expect(() =>
      heat2d({
        gridX: unitSquare,
        gridY: unitSquare,
        alpha: 1,
        dt: 0.001,
        steps: 5,
        initial: sinMode2D,
        boundary: { bottom: 0, top: 0, left: 0, right: 0 },
      })
    ).toThrow(NumericalInstabilityError);
  });

  it("names rx+ry and the 0.5 limit in the instability message", () => {
    let msg = "";
    try {
      heat2d({
        gridX: unitSquare,
        gridY: unitSquare,
        alpha: 1,
        dt: 0.001,
        steps: 5,
        initial: sinMode2D,
        boundary: { bottom: 0, top: 0, left: 0, right: 0 },
      });
    } catch (e) {
      msg = (e as Error).message;
    }
    expect(msg).toMatch(/0\.5/);
    expect(msg.toLowerCase()).toContain("rx+ry");
  });

  it("accepts exactly rx+ry = 0.5 (the stability boundary is allowed)", () => {
    // dx = dy = 0.05 => 1/dx^2 = 400, rx+ry = 800*dt = 0.5 => dt = 0.5/800 = 0.000625
    const r = heat2d({
      gridX: unitSquare,
      gridY: unitSquare,
      alpha: 1,
      dt: 0.000625,
      steps: 5,
      initial: sinMode2D,
      boundary: { bottom: 0, top: 0, left: 0, right: 0 },
    });
    expect(r.stabilityNumber).toBeCloseTo(0.5, 12);
  });

  it("throws when alpha is non-positive", () => {
    expect(() =>
      heat2d({
        gridX: unitSquare,
        gridY: unitSquare,
        alpha: 0,
        dt: 0.0005,
        steps: 5,
        initial: sinMode2D,
        boundary: { bottom: 0, top: 0, left: 0, right: 0 },
      })
    ).toThrow(InvalidInputError);
    expect(() =>
      heat2d({
        gridX: unitSquare,
        gridY: unitSquare,
        alpha: -1,
        dt: 0.0005,
        steps: 5,
        initial: sinMode2D,
        boundary: { bottom: 0, top: 0, left: 0, right: 0 },
      })
    ).toThrow(InvalidInputError);
  });

  it("throws when dt is non-positive", () => {
    expect(() =>
      heat2d({
        gridX: unitSquare,
        gridY: unitSquare,
        alpha: 1,
        dt: 0,
        steps: 5,
        initial: sinMode2D,
        boundary: { bottom: 0, top: 0, left: 0, right: 0 },
      })
    ).toThrow(InvalidInputError);
  });

  it("throws when steps is not a positive integer", () => {
    expect(() =>
      heat2d({
        gridX: unitSquare,
        gridY: unitSquare,
        alpha: 1,
        dt: 0.0005,
        steps: 0,
        initial: sinMode2D,
        boundary: { bottom: 0, top: 0, left: 0, right: 0 },
      })
    ).toThrow(InvalidInputError);
    expect(() =>
      heat2d({
        gridX: unitSquare,
        gridY: unitSquare,
        alpha: 1,
        dt: 0.0005,
        steps: 1.5,
        initial: sinMode2D,
        boundary: { bottom: 0, top: 0, left: 0, right: 0 },
      })
    ).toThrow(InvalidInputError);
  });

  it("throws when grid is coarser than 3 points", () => {
    expect(() =>
      heat2d({
        gridX: { xMin: 0, xMax: 1, nx: 2 },
        gridY: unitSquare,
        alpha: 1,
        dt: 0.0005,
        steps: 5,
        initial: sinMode2D,
        boundary: { bottom: 0, top: 0, left: 0, right: 0 },
      })
    ).toThrow(InvalidInputError);
    expect(() =>
      heat2d({
        gridX: unitSquare,
        gridY: { xMin: 0, xMax: 1, nx: 2 },
        alpha: 1,
        dt: 0.0005,
        steps: 5,
        initial: sinMode2D,
        boundary: { bottom: 0, top: 0, left: 0, right: 0 },
      })
    ).toThrow(InvalidInputError);
  });

  it("rejects a space-time grid that would blow the memory budget", () => {
    // nx=2048 (=MAX_GRID) × many steps ⇒ cells > MAX_CELLS
    expect(() =>
      heat2d({
        gridX: { xMin: 0, xMax: 1, nx: 2048 },
        gridY: { xMin: 0, xMax: 1, nx: 2048 },
        alpha: 1,
        dt: 1e-9,
        steps: 2,
        initial: sinMode2D,
        boundary: { bottom: 0, top: 0, left: 0, right: 0 },
      })
    ).toThrow(ResourceLimitError);
  });
});

describe("heat2d — boundary conditions", () => {
  it("holds Dirichlet boundary values fixed at every step on all four sides (corners taken by left/right)", () => {
    const r = heat2d({
      gridX: unitSquare,
      gridY: unitSquare,
      alpha: 1,
      dt: 0.0005,
      steps: 40,
      initial: () => 50,
      boundary: { bottom: 3, top: 7, left: 11, right: 13 },
    });
    const lastX = r.x.length - 1;
    const lastY = r.y.length - 1;
    for (const slice of r.u) {
      // bottom (j=0) - excluding corners which belong to left/right
      for (let i = 1; i < lastX; i++) expect(slice[i][0]).toBe(3);
      // top (j=lastY) - excluding corners
      for (let i = 1; i < lastX; i++) expect(slice[i][lastY]).toBe(7);
      // left (i=0) - all j including corners
      for (let j = 0; j < r.y.length; j++) expect(slice[0][j]).toBe(11);
      // right (i=lastX) - all j including corners
      for (let j = 0; j < r.y.length; j++) expect(slice[lastX][j]).toBe(13);
    }
  });

  it("supports function boundaries", () => {
    const r = heat2d({
      gridX: unitSquare,
      gridY: unitSquare,
      alpha: 1,
      dt: 0.0005,
      steps: 10,
      initial: () => 0,
      boundary: {
        bottom: (x: number) => x, // varies along x
        top: 0,
        left: 0,
        right: 0,
      },
    });
    // Check bottom boundary (j=0) excluding corners (i=0 and i=lastX are left/right)
    for (let i = 1; i < r.x.length - 1; i++) {
      expect(r.u[0][i][0]).toBeCloseTo(r.x[i], 10);
    }
  });
});

describe("heat2d — physical behaviour", () => {
  it("a hot plate with cold Dirichlet boundaries cools monotonically (max never rises)", () => {
    const r = heat2d({
      gridX: unitSquare,
      gridY: unitSquare,
      alpha: 1,
      dt: 0.0005,
      steps: 60,
      initial: () => 100,
      boundary: { bottom: 0, top: 0, left: 0, right: 0 },
    });
    const sliceMax = r.u.map(maxAbs2D);
    for (let n = 1; n < sliceMax.length; n++) {
      expect(sliceMax[n]).toBeLessThanOrEqual(sliceMax[n - 1] + 1e-9);
    }
    expect(sliceMax[sliceMax.length - 1]).toBeLessThan(sliceMax[0]); // strictly cooled overall
  });

  it("interior never exceeds initial/boundary extremes (discrete maximum principle)", () => {
    const r = heat2d({
      gridX: unitSquare,
      gridY: unitSquare,
      alpha: 1,
      dt: 0.0005,
      steps: 100,
      initial: () => 50,
      boundary: { bottom: 0, top: 0, left: 0, right: 0 },
    });
    for (const slice of r.u) {
      for (const row of slice) {
        for (const v of row) {
          expect(v).toBeLessThanOrEqual(50 + 1e-9);
          expect(v).toBeGreaterThanOrEqual(0 - 1e-9);
        }
      }
    }
  });
});

describe("heat2d — input validation", () => {
  it("rejects non-finite alpha", () => {
    expect(() =>
      heat2d({
        gridX: unitSquare,
        gridY: unitSquare,
        alpha: NaN,
        dt: 0.0005,
        steps: 5,
        initial: sinMode2D,
        boundary: { bottom: 0, top: 0, left: 0, right: 0 },
      })
    ).toThrow(InvalidInputError);
  });

  it("rejects non-finite dt", () => {
    expect(() =>
      heat2d({
        gridX: unitSquare,
        gridY: unitSquare,
        alpha: 1,
        dt: Infinity,
        steps: 5,
        initial: sinMode2D,
        boundary: { bottom: 0, top: 0, left: 0, right: 0 },
      })
    ).toThrow(InvalidInputError);
  });

  it("rejects non-finite boundary values", () => {
    expect(() =>
      heat2d({
        gridX: unitSquare,
        gridY: unitSquare,
        alpha: 1,
        dt: 0.0005,
        steps: 5,
        initial: sinMode2D,
        boundary: { bottom: NaN, top: 0, left: 0, right: 0 },
      })
    ).toThrow(InvalidInputError);
  });

  it("rejects initial condition producing non-finite values", () => {
    expect(() =>
      heat2d({
        gridX: unitSquare,
        gridY: unitSquare,
        alpha: 1,
        dt: 0.0005,
        steps: 5,
        initial: () => NaN,
        boundary: { bottom: 0, top: 0, left: 0, right: 0 },
      })
    ).toThrow(InvalidInputError);
  });

  it("rejects invalid grid (xMax <= xMin)", () => {
    expect(() =>
      heat2d({
        gridX: { xMin: 1, xMax: 0, nx: 10 },
        gridY: unitSquare,
        alpha: 1,
        dt: 0.0005,
        steps: 5,
        initial: sinMode2D,
        boundary: { bottom: 0, top: 0, left: 0, right: 0 },
      })
    ).toThrow(InvalidInputError);
  });
});