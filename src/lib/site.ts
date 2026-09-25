/**
 * Site-wide constants for the AXIOM landing.
 * All external links are real, evidence-based URLs from the repository README.
 */
export const SITE = {
  name: "AXIOM",
  url: "https://axiom-simulator.vercel.app",
  /** Internal route for the ported simulator SPA (was `url`, now same-app). */
  simulatorPath: "/simulator",
  github: "https://github.com/Max-arango/Mathematics-simulator",
  license: "MIT",
  tagline: "Open-source mathematical exploration.",
} as const;
