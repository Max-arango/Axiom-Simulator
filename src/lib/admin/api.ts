import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Route-handler helpers for the admin API (Supabase-backed).
 * Self-contained: no Prisma, no custom-session code.
 */

const NO_STORE = { "Cache-Control": "no-store, max-age=0" } as const;

export class ApiError extends Error {
  readonly status: number;
  readonly extra?: Record<string, unknown>;
  constructor(status: number, message: string, extra?: Record<string, unknown>) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}

export function jsonOk<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status, headers: NO_STORE });
}

export function jsonError(error: string, status: number, extra?: Record<string, unknown>): NextResponse {
  return NextResponse.json({ error, ...extra }, { status, headers: NO_STORE });
}

export function handleApiError(err: unknown): NextResponse {
  if (err instanceof ApiError) {
    return jsonError(err.message, err.status, err.extra);
  }
  console.error("[admin-api] unhandled error", err);
  return jsonError("Error interno del servidor.", 500);
}

export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

export const PERMISSION_KEYS = [
  "users:read",
  "users:write",
  "sessions:revoke",
  "audit:read",
] as const;

export function isValidPermissionKey(key: string): boolean {
  return (PERMISSION_KEYS as readonly string[]).includes(key);
}

/**
 * The gate for every /api/admin route. Requires an authenticated Supabase user
 * whose profile has role = 'admin'. Throws ApiError(401/403) otherwise.
 */
export async function requireAdmin(): Promise<{ id: string; email: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new ApiError(401, "Necesitas iniciar sesión para acceder al panel de administración.");
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "admin") {
    throw new ApiError(403, "No tienes permisos de administrador para realizar esta acción.");
  }
  return { id: user.id, email: user.email ?? "" };
}
