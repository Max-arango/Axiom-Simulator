import { requireAdmin, handleApiError, jsonOk, readJson, ApiError } from "@/lib/admin/api";
import { createAdminClient } from "@/lib/supabase/admin";
import { writeAudit } from "@/lib/ternary-access/audit";
import { KNOWN_FLAG_KEYS, listFlags } from "@/lib/admin/ternary";

export const runtime = "nodejs";

/**
 * PATCH /api/admin/ternary/flags — flip a known feature flag. ADMIN ONLY.
 * TERNARY_BETA is the master kill-switch consulted by has_ternary_beta_access().
 */
export async function PATCH(req: Request) {
  try {
    const acting = await requireAdmin();
    const body = (await readJson(req)) as Record<string, unknown> | null;
    const key = typeof body?.key === "string" ? body.key : "";
    const enabled = body?.enabled;
    if (typeof enabled !== "boolean") throw new ApiError(400, "El valor 'enabled' debe ser booleano.");
    if (!(KNOWN_FLAG_KEYS as readonly string[]).includes(key)) {
      throw new ApiError(400, "Clave de flag desconocida.");
    }

    const admin = createAdminClient();
    const { error: upErr } = await admin
      .from("feature_flags")
      .upsert({ key, enabled, updated_at: new Date().toISOString() }, { onConflict: "key" });
    if (upErr) throw new ApiError(400, upErr.message);

    await writeAudit({
      actor: acting.id,
      target: null,
      action: "feature_flag_changed",
      metadata: { key, enabled },
    });

    return jsonOk({ flags: await listFlags(admin) });
  } catch (err) {
    return handleApiError(err);
  }
}
