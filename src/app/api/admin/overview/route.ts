import { requireAdmin, handleApiError, jsonOk } from "@/lib/admin/api";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/**
 * GET /api/admin/overview — dashboard counters. ADMIN ONLY.
 * Note: Supabase does not expose an auth-attempt audit table, so
 * failedAttempts24h / totalAttempts24h are 0 and recentAttempts is empty.
 * activeSessions is not derivable from the admin API here → 0.
 */
export async function GET() {
  try {
    await requireAdmin();
    const admin = createAdminClient();

    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const users = list?.users ?? [];
    const now = Date.now();
    const activeUsers = users.filter(
      (u) => !(u.banned_until && new Date(u.banned_until).getTime() > now),
    ).length;

    const { count: adminUsers } = await admin
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "admin");

    return jsonOk({
      stats: {
        totalUsers: users.length,
        activeUsers,
        adminUsers: adminUsers ?? 0,
        activeSessions: 0,
        failedAttempts24h: 0,
        totalAttempts24h: 0,
      },
      recentAttempts: [],
    });
  } catch (err) {
    return handleApiError(err);
  }
}
