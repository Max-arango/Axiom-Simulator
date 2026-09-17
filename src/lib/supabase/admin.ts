import "server-only"; // build-time guard: any client-bundle import of this service-role module fails the build.
import { createClient as createSbClient } from "@supabase/supabase-js";
import type { Database } from "./types";
import { ApiError } from "@/lib/admin/api";

/**
 * Service-role Supabase client. BYPASSES Row Level Security and can reach the
 * Auth admin API (auth.users). Only ever used from server route handlers behind
 * requireAdmin(). The key must never be exposed to the browser.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new ApiError(
      501,
      "El panel de administración necesita SUPABASE_SERVICE_ROLE_KEY configurada en el servidor.",
    );
  }
  return createSbClient<Database>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/* ------------------------------ Shared mapper ---------------------------- */

export type AdminAuthUser = {
  id: string;
  email?: string | null;
  created_at?: string;
  last_sign_in_at?: string | null;
  email_confirmed_at?: string | null;
  banned_until?: string | null;
};

type ProfileRow = { display_name?: string | null; role?: string | null } | null;

/** Build the AdminUser shape the dashboard expects (see admin-types.ts). */
export function toAdminUser(authUser: AdminAuthUser, profile: ProfileRow, permKeys: string[]) {
  const banned =
    !!authUser.banned_until && new Date(authUser.banned_until).getTime() > Date.now();
  return {
    id: authUser.id,
    email: authUser.email ?? "",
    name: profile?.display_name ?? null,
    role: profile?.role === "admin" ? "ADMIN" : "USER",
    isActive: !banned,
    permissions: permKeys,
    emails: [
      {
        address: authUser.email ?? "",
        isPrimary: true,
        isVerified: !!authUser.email_confirmed_at,
      },
    ],
    createdAt: authUser.created_at ?? "",
    lastLoginAt: authUser.last_sign_in_at ?? null,
    activeSessions: 0,
  };
}
