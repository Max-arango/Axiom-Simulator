import { requireAdmin, handleApiError, jsonOk, readJson, ApiError } from "@/lib/admin/api";
import { createAdminClient } from "@/lib/supabase/admin";
import { writeAudit } from "@/lib/ternary-access/audit";
import { buildTernaryUser, computeExpiry } from "@/lib/admin/ternary";

export const runtime = "nodejs";

/**
 * POST /api/admin/ternary/grant — issue a Ternary Beta grant to a user.
 * ADMIN ONLY. Append-only: a new grant row is inserted (never mutating history).
 */
export async function POST(req: Request) {
  try {
    const acting = await requireAdmin();
    const body = (await readJson(req)) as Record<string, unknown> | null;
    if (!body || typeof body !== "object") throw new ApiError(400, "Datos inválidos.");

    const userId = typeof body.userId === "string" ? body.userId : "";
    const duration = typeof body.duration === "string" ? body.duration : "";
    const expiresAtInput = typeof body.expiresAt === "string" ? body.expiresAt : undefined;
    const reason = typeof body.reason === "string" ? body.reason : null;
    const note = typeof body.note === "string" ? body.note : null;
    if (!userId) throw new ApiError(400, "Falta el identificador de usuario.");

    const admin = createAdminClient();

    // Confirm the target exists before writing a grant for it.
    const { data: targetAuth, error: getErr } = await admin.auth.admin.getUserById(userId);
    if (getErr || !targetAuth?.user) throw new ApiError(404, "Usuario no encontrado.");

    const expiresAt = computeExpiry(duration, expiresAtInput);

    const { error: insErr } = await admin.from("ternary_beta_grants").insert({
      user_id: userId,
      granted_by: acting.id,
      reason,
      note,
      expires_at: expiresAt,
    });
    if (insErr) throw new ApiError(400, insErr.message);

    await writeAudit({
      actor: acting.id,
      target: userId,
      action: "beta_access_granted",
      metadata: { duration, expiresAt, reason },
    });

    return jsonOk({ user: await buildTernaryUser(admin, userId) });
  } catch (err) {
    return handleApiError(err);
  }
}
