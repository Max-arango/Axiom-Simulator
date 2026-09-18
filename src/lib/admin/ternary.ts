import { ApiError } from "@/lib/admin/api";

/**
 * Shared helpers for the /api/admin/ternary routes. Every function here runs
 * behind requireAdmin() through the service-role client (bypasses RLS); the DB
 * is still the source of truth. computeExpiry is pure and unit-tested.
 */

// Type-only import: no runtime require, so the pure computeExpiry stays cheap to
// unit-test (it never pulls the service-role/@supabase modules).
type AdminClient = ReturnType<typeof import("@/lib/supabase/admin").createAdminClient>;

/** The feature flags the admin panel manages. flags/route.ts validates against this. */
export const KNOWN_FLAG_KEYS = [
  "TERNARY_BETA",
  "TERNARY_LOGIC",
  "TERNARY_ALU",
  "TERNARY_CPU",
  "TERNARY_MEMORY",
  "TERNARY_EXPERIMENTS",
] as const;

const MASTER_FLAG = "TERNARY_BETA";

export type TernaryGrant = {
  grantedAt: string;
  expiresAt: string | null;
  reason: string | null;
  note: string | null;
};

/** The exact shape the frontend consumes (LOCKED contract). */
export type TernaryUser = {
  id: string;
  email: string;
  name: string | null;
  role: "USER" | "ADMIN";
  status: "active" | "suspended" | "revoked";
  hasAccess: boolean;
  grant: TernaryGrant | null;
};

export type FeatureFlag = {
  key: string;
  enabled: boolean;
  description: string | null;
};

const DAYS: Record<string, number> = { "7d": 7, "30d": 30, "90d": 90 };
const DAY_MS = 86_400_000;

/**
 * Resolve a grant duration to an ISO expiry (or null for permanent). PURE except
 * Date.now(), which the contract allows here. Throws ApiError(400) on a missing,
 * past, or unparseable custom date, or an unknown duration.
 */
export function computeExpiry(duration: string, customIso?: string): string | null {
  if (duration === "permanent") return null;
  if (duration in DAYS) {
    return new Date(Date.now() + DAYS[duration] * DAY_MS).toISOString();
  }
  if (duration === "custom") {
    if (!customIso) throw new ApiError(400, "Debes indicar una fecha de expiración.");
    const t = Date.parse(customIso);
    if (Number.isNaN(t)) throw new ApiError(400, "Fecha de expiración inválida.");
    if (t <= Date.now()) throw new ApiError(400, "La fecha de expiración debe ser futura.");
    return new Date(t).toISOString();
  }
  throw new ApiError(400, "Duración inválida.");
}

/* --------------------------- internal mapping ---------------------------- */

type GrantRow = {
  user_id: string;
  granted_at: string;
  expires_at: string | null;
  reason: string | null;
  note: string | null;
  revoked_at: string | null;
};

type ProfileRow = { display_name?: string | null; role?: string | null; status?: string | null } | null;

const STATUSES = new Set(["active", "suspended", "revoked"]);

function normalizeStatus(status: string | null | undefined): TernaryUser["status"] {
  return status && STATUSES.has(status) ? (status as TernaryUser["status"]) : "active";
}

/** ACTIVE iff not revoked and (no expiry or expiry still in the future). */
function isActiveGrant(g: GrantRow, now: number): boolean {
  return g.revoked_at === null && (g.expires_at === null || Date.parse(g.expires_at) > now);
}

function toTernaryUser(
  authUser: { id: string; email?: string | null },
  profile: ProfileRow,
  grants: GrantRow[],
  flagEnabled: boolean,
): TernaryUser {
  const now = Date.now();
  // Most recent ACTIVE grant (by granted_at); null when none is active.
  const active =
    grants
      .filter((g) => isActiveGrant(g, now))
      .sort((a, b) => (a.granted_at < b.granted_at ? 1 : a.granted_at > b.granted_at ? -1 : 0))[0] ??
    null;
  const status = normalizeStatus(profile?.status);
  return {
    id: authUser.id,
    email: authUser.email ?? "",
    name: profile?.display_name ?? null,
    role: profile?.role === "admin" ? "ADMIN" : "USER",
    status,
    // Mirrors has_ternary_beta_access(): active profile + active grant + flag on.
    hasAccess: status === "active" && active !== null && flagEnabled,
    grant: active
      ? { grantedAt: active.granted_at, expiresAt: active.expires_at, reason: active.reason, note: active.note }
      : null,
  };
}

async function isMasterFlagEnabled(admin: AdminClient): Promise<boolean> {
  const { data } = await admin
    .from("feature_flags")
    .select("enabled")
    .eq("key", MASTER_FLAG)
    .maybeSingle();
  return data?.enabled ?? false;
}

const GRANT_COLS = "user_id, granted_at, expires_at, reason, note, revoked_at";

/* ------------------------------- queries --------------------------------- */

/** One TU. Throws ApiError(404) if the auth user does not exist. */
export async function buildTernaryUser(admin: AdminClient, userId: string): Promise<TernaryUser> {
  const { data: authRes, error } = await admin.auth.admin.getUserById(userId);
  if (error || !authRes?.user) throw new ApiError(404, "Usuario no encontrado.");

  const { data: profile } = await admin
    .from("profiles")
    .select("display_name, role, status")
    .eq("id", userId)
    .maybeSingle();
  const { data: grants } = await admin
    .from("ternary_beta_grants")
    .select(GRANT_COLS)
    .eq("user_id", userId);

  return toTernaryUser(authRes.user, profile, (grants ?? []) as GrantRow[], await isMasterFlagEnabled(admin));
}

/** All users as TU[], sorted by email for a stable order. */
export async function listTernaryUsers(admin: AdminClient): Promise<TernaryUser[]> {
  const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const users = list?.users ?? [];

  const { data: profiles } = await admin.from("profiles").select("id, display_name, role, status");
  const { data: grants } = await admin.from("ternary_beta_grants").select(GRANT_COLS);
  const flagEnabled = await isMasterFlagEnabled(admin);

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));
  const grantsByUser = new Map<string, GrantRow[]>();
  for (const g of (grants ?? []) as GrantRow[]) {
    const arr = grantsByUser.get(g.user_id) ?? [];
    arr.push(g);
    grantsByUser.set(g.user_id, arr);
  }

  return users
    .map((u) => toTernaryUser(u, profileById.get(u.id) ?? null, grantsByUser.get(u.id) ?? [], flagEnabled))
    .sort((a, b) => (a.email < b.email ? -1 : a.email > b.email ? 1 : 0));
}

/** The known flags in a fixed order; missing rows default to disabled. */
export async function listFlags(admin: AdminClient): Promise<FeatureFlag[]> {
  const { data } = await admin.from("feature_flags").select("key, enabled, description");
  const byKey = new Map((data ?? []).map((f) => [f.key, f]));
  return KNOWN_FLAG_KEYS.map((key) => {
    const row = byKey.get(key);
    return { key, enabled: row?.enabled ?? false, description: row?.description ?? null };
  });
}
