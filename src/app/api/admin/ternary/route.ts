import { requireAdmin, handleApiError, jsonOk } from "@/lib/admin/api";
import { createAdminClient } from "@/lib/supabase/admin";
import { listTernaryUsers, listFlags } from "@/lib/admin/ternary";

export const runtime = "nodejs";

/**
 * GET /api/admin/ternary — every user's Ternary Beta access state + the feature
 * flags. ADMIN ONLY.
 */
export async function GET() {
  try {
    await requireAdmin();
    const admin = createAdminClient();
    const [users, flags] = await Promise.all([listTernaryUsers(admin), listFlags(admin)]);
    return jsonOk({ users, flags });
  } catch (err) {
    return handleApiError(err);
  }
}
