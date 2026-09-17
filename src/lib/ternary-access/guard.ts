import "server-only"; // build-time guard: importing this module from a client bundle fails.
import { createClient } from "@/lib/supabase/server";
import { ApiError } from "@/lib/admin/api";
import type { User } from "@supabase/supabase-js";

/**
 * Server-side gate for the Ternary Beta. The database is the source of truth:
 * access = admin OR public.has_ternary_beta_access() (active profile + active
 * grant + TERNARY_BETA flag on). Client hooks are UX hints only.
 */

// Neutral, non-leaking message (§9): the same 403 whether the user is
// unauthenticated, not an admin, or simply ungranted — internals stay hidden.
const DENIED = "Experimental access required";

/**
 * Throws ApiError(403) unless the current user has Ternary Beta access.
 * Returns the authenticated user on success.
 */
export async function requireTernaryBeta(): Promise<User> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new ApiError(403, DENIED);
  }

  // Admins always pass; otherwise defer to the DB predicate.
  // NOTE (rt-3, intentional): admins are exempt from the TERNARY_BETA
  // kill-switch — they can enter the beta area even when the flag is off, to
  // moderate/debug. Flags are flipped from the role-gated admin panel, not the
  // beta area, so this is not a lock-out risk. To make the kill-switch win for
  // everyone, read feature_flags TERNARY_BETA here and deny before this branch.
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role === "admin") {
    return user;
  }

  const { data: hasAccess, error } = await supabase.rpc("has_ternary_beta_access");
  if (error || !hasAccess) {
    throw new ApiError(403, DENIED);
  }
  return user;
}

/**
 * Non-throwing variant for page/layout gating. Returns false on any failure
 * (no session, RPC error, ungranted) so callers can hide UI without try/catch.
 */
export async function getTernaryAccess(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role === "admin") return true;

  const { data: hasAccess } = await supabase.rpc("has_ternary_beta_access");
  return hasAccess === true;
}
