import { requireAdmin, handleApiError, jsonOk, readJson, ApiError } from "@/lib/admin/api";
import { createAdminClient } from "@/lib/supabase/admin";
import { writeAudit } from "@/lib/ternary-access/audit";
import { buildTernaryUser } from "@/lib/admin/ternary";

export const runtime = "nodejs";

/**
 * POST /api/admin/ternary/revoke — revoke ALL active grants of a user (sets
 * revoked_at / revoked_by; history is preserved). ADMIN ONLY.
 */
export async function POST(req: Request) {
  try {
    const acting = await requireAdmin();
    const body = (await readJson(req)) as Record<string, unknown> | null;
    const userId = typeof body?.userId === "string" ? body.userId : "";
    if (!userId) throw new ApiError(400, "Falta el identificador de usuario.");

    const admin = createAdminClient();
    const { data: targetAuth, error: getErr } = await admin.auth.admin.getUserById(userId);
    if (getErr || !targetAuth?.user) throw new ApiError(404, "Usuario no encontrado.");

    const nowIso = new Date().toISOString();
    // Target only ACTIVE grants: not already revoked, and not already expired.
    const { error: updErr } = await admin
      .from("ternary_beta_grants")
      .update({ revoked_at: nowIso, revoked_by: acting.id })
      .eq("user_id", userId)
      .is("revoked_at", null)
      .or(`expires_at.is.null,expires_at.gt.${nowIso}`);
    if (updErr) throw new ApiError(400, updErr.message);

    await writeAudit({ actor: acting.id, target: userId, action: "beta_access_revoked" });

    return jsonOk({ user: await buildTernaryUser(admin, userId) });
  } catch (err) {
    return handleApiError(err);
  }
}
