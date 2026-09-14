import { requireAdmin, handleApiError, jsonOk } from "@/lib/admin/api";

export const runtime = "nodejs";

/**
 * GET /api/admin/login-attempts — ADMIN ONLY.
 * Supabase does not expose a per-attempt auth audit table through the client,
 * so this returns an empty list (the dashboard tab renders "no attempts"
 * instead of 404ing). Auth logs live in the Supabase dashboard Logs explorer.
 */
export async function GET() {
  try {
    await requireAdmin();
    return jsonOk({ attempts: [] });
  } catch (err) {
    return handleApiError(err);
  }
}
