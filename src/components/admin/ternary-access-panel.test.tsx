// Render smoke test for the Ternary Beta admin panel.
//
// Uses react-dom/server (renderToString) — no jsdom / testing-library — to
// render the panel to static HTML and assert the seed data surfaces. This
// proves the panel renders both users, their access/status badges and the six
// feature-flag labels without crashing. Radix portals (the grant Dialog, the
// duration Select) render out-of-tree from a closed initial state and are
// intentionally not asserted here.
import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";

import { FLAG_LABELS, type FeatureFlag, type TernaryUser } from "./admin-types";
import { TernaryAccessPanel } from "./ternary-access-panel";

const users: TernaryUser[] = [
  {
    id: "u1",
    email: "ada@example.com",
    name: "Ada Lovelace",
    role: "USER",
    status: "active",
    hasAccess: true,
    grant: {
      grantedAt: "2026-01-01T00:00:00.000Z",
      expiresAt: "2026-12-31T00:00:00.000Z",
      reason: "early access",
      note: null,
    },
  },
  {
    id: "u2",
    email: "bob@example.com",
    name: null,
    role: "USER",
    status: "revoked",
    hasAccess: false,
    grant: null,
  },
];

const flags: FeatureFlag[] = [
  "TERNARY_BETA",
  "TERNARY_LOGIC",
  "TERNARY_ALU",
  "TERNARY_CPU",
  "TERNARY_MEMORY",
  "TERNARY_EXPERIMENTS",
].map((key) => ({ key, enabled: key === "TERNARY_BETA", description: null }));

const noop = () => {};

describe("TernaryAccessPanel renders seed users and flags", () => {
  const html = renderToString(
    <TernaryAccessPanel
      users={users}
      flags={flags}
      onGrant={noop}
      onRevoke={noop}
      onStatus={noop}
      onFlag={noop}
    />,
  );

  it("shows both users", () => {
    expect(html).toContain("Ada Lovelace");
    expect(html).toContain("ada@example.com");
    expect(html).toContain("bob@example.com");
    expect(html).toContain("Sin nombre"); // bob has no name
  });

  it("renders access and status badges with expiry", () => {
    expect(html).toContain("Con acceso"); // ada
    expect(html).toContain("Sin acceso"); // bob
    expect(html).toContain("Activo"); // ada status
    expect(html).toContain("Revocado"); // bob status
    expect(html).toContain("Expira"); // ada's grant has an expiry date
  });

  it("renders row actions", () => {
    expect(html).toContain("Otorgar");
    expect(html).toContain("Revocar"); // shown for ada (hasAccess)
    expect(html).toContain("Suspender"); // shown for the active user
    expect(html).toContain("Activar"); // shown for the revoked user
  });

  it("renders all six feature-flag labels", () => {
    for (const label of Object.values(FLAG_LABELS)) {
      expect(html).toContain(label);
    }
    expect(html).toContain("Kill-switch"); // TERNARY_BETA master switch marker
  });
});
