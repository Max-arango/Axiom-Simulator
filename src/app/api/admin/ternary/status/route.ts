import { requireAdmin, handleApiError, jsonOk, readJson, ApiError } from "@/lib/admin/api";
import { createAdminClient } from "@/lib/supabase/admin";
import { writeAudit } from "@/lib/ternary-access/audit";
import { buildTernaryUser } from "@/lib/admin/ternary";

export const runtime = "nodejs";

const STATUSES = ["active", "suspended", "revoked"] as const;

/**
 * PATCH /api/admin/ternary/status — set a user's account lifecycle status.
 * ADMIN ONLY. Blocks self-lockout (an admin cannot suspend/revoke themselves).
 */
export async function PATCH(req: Request) {
  try {
    const acting = await requireAdmin();
    const body = (await readJson(req)) as Record<string, unknown> | null;
    const userId = typeof body?.userId === "string" ? body.userId : "";
    const status = body?.status;
    if (!userId) throw new ApiError(400, "Falta el identificador de usuario.");
    if (typeof status !== "string" || !(STATUSES as readonly string[]).includes(status)) {
      throw new ApiError(400, "Estado inválido.");
    }
    if (userId === acting.id && status !== "active") {
      throw new ApiError(400, "No puedes suspender tu propia cuenta.");
    }

    const admin = createAdminClient();
    const { data: targetAuth, error: getErr } = await admin.auth.admin.getUserById(userId);
    if (getErr || !targetAuth?.user) throw new ApiError(404, "Usuario no encontrado.");

    const { error: updErr } = await admin.from("profiles").update({ status }).eq("id", userId);
    if (updErr) throw new ApiError(400, updErr.message);

    await writeAudit({
      actor: acting.id,
      target: userId,
      action: "account_status_changed",
      metadata: { status },
    });

    return jsonOk({ user: await buildTernaryUser(admin, userId) });
  } catch (err) {
    return handleApiError(err);
  }
}
