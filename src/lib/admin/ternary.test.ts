import { describe, it, expect } from "vitest";
import { computeExpiry } from "./ternary";
import { ApiError } from "@/lib/admin/api";

const DAY = 86_400_000;

describe("computeExpiry", () => {
  it("permanent -> null", () => {
    expect(computeExpiry("permanent")).toBeNull();
  });

  it.each([
    ["7d", 7],
    ["30d", 30],
    ["90d", 90],
  ] as const)("%s -> now + %d days (within tolerance)", (duration, days) => {
    const before = Date.now();
    const iso = computeExpiry(duration);
    expect(iso).not.toBeNull();
    const delta = Date.parse(iso!) - before;
    expect(Math.abs(delta - days * DAY)).toBeLessThan(2000); // <2s wall-clock slack
  });

  it("custom future -> that exact ISO", () => {
    const future = new Date(Date.now() + 5 * DAY).toISOString();
    expect(computeExpiry("custom", future)).toBe(future);
  });

  it("custom missing -> 400", () => {
    expect(() => computeExpiry("custom")).toThrow(ApiError);
  });

  it("custom past -> 400", () => {
    const past = new Date(Date.now() - DAY).toISOString();
    expect(() => computeExpiry("custom", past)).toThrow(ApiError);
  });

  it("custom unparseable -> 400", () => {
    expect(() => computeExpiry("custom", "not-a-date")).toThrow(ApiError);
  });

  it("unknown duration -> 400", () => {
    expect(() => computeExpiry("bogus")).toThrow(ApiError);
  });
});
