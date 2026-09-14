import {
  requireAdmin,
  handleApiError,
  jsonOk,
  readJson,
  ApiError,
  isValidPermissionKey,
} from "@/lib/admin/api";
import { createAdminClient, toAdminUser } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

// Supabase ban with an effectively-permanent duration = "deactivated".
const BAN_FOREVER = "876000h"; // 100 years

/** Guard: keep at least one admin. Throws if `id` is the last admin being demoted/deactivated. */
async function ensureNotLastAdmin(
  admin: ReturnType<typeof createAdminClient>,
  id: string,
  demoting: boolean,
  deactivating: boolean,
) {
  if (!demoting && !deactivating) return;
  const { count } = await admin
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("role", "admin")
    .neq("id", id);
  if ((count ?? 0) === 0) {
    throw new ApiError(400, "No puedes quitar al último administrador del sistema.");
  }
}

/**
 * PATCH /api/admin/users/{id} — edit name, role, isActive, permissions and/or
 * reset the password via the Supabase Auth admin API + profiles. ADMIN ONLY.
 */
export async function PATCH(req: Request, ctx: RouteContext) {
  try {
    await requireAdmin();
    const { id } = await ctx.params;
    const body = (await readJson(req)) as Record<string, unknown> | null;
    if (!body || typeof body !== "object") throw new ApiError(400, "Datos inválidos.");

    const name = typeof body.name === "string" ? body.name.trim() : undefined;
    const role = body.role === "ADMIN" ? "ADMIN" : body.role === "USER" ? "USER" : undefined;
    const isActive = typeof body.isActive === "boolean" ? body.isActive : undefined;
    const permissions = Array.isArray(body.permissions)
      ? (body.permissions.filter((k) => typeof k === "string") as string[])
      : undefined;
    const password = typeof body.password === "string" ? body.password : undefined;

    if (name === undefined && role === undefined && isActive === undefined && permissions === undefined && password === undefined) {
      throw new ApiError(400, "No hay cambios que aplicar.");
    }
    if (password !== undefined && password.length < 8) {
      throw new ApiError(400, "La contraseña debe tener al menos 8 caracteres.");
    }

    const admin = createAdminClient();

    // Confirm the target exists.
    const { data: targetAuth, error: getErr } = await admin.auth.admin.getUserById(id);
    if (getErr || !targetAuth?.user) throw new ApiError(404, "Usuario no encontrado.");
    const { data: targetProfile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", id)
      .maybeSingle();

    await ensureNotLastAdmin(
      admin,
      id,
      targetProfile?.role === "admin" && role === "USER",
      isActive === false,
    );

    // profiles updates
    const profileUpdate: { display_name?: string; role?: string } = {};
    if (name !== undefined) profileUpdate.display_name = name;
    if (role !== undefined) profileUpdate.role = role === "ADMIN" ? "admin" : "user";
    if (Object.keys(profileUpdate).length > 0) {
      await admin.from("profiles").update(profileUpdate).eq("id", id);
    }

    // auth updates: ban/unban + password
    if (isActive !== undefined) {
      await admin.auth.admin.updateUserById(id, { ban_duration: isActive ? "none" : BAN_FOREVER });
    }
    if (password !== undefined) {
      await admin.auth.admin.updateUserById(id, { password });
    }

    // permissions: replace the set
    if (permissions !== undefined) {
      const keys = Array.from(new Set(permissions.filter(isValidPermissionKey)));
      await admin.from("permissions").delete().eq("user_id", id);
      if (keys.length > 0) {
        await admin.from("permissions").insert(keys.map((key) => ({ user_id: id, key })));
      }
    }

    // Re-fetch fresh state
    const { data: freshAuth } = await admin.auth.admin.getUserById(id);
    const { data: freshProfile } = await admin
      .from("profiles")
      .select("display_name, role")
      .eq("id", id)
      .maybeSingle();
    const { data: freshPerms } = await admin.from("permissions").select("key").eq("user_id", id);
    if (!freshAuth?.user) throw new ApiError(404, "Usuario no encontrado.");

    return jsonOk({
      user: toAdminUser(freshAuth.user, freshProfile, (freshPerms ?? []).map((p) => p.key)),
    });
  } catch (err) {
    return handleApiError(err);
  }
}

/**
 * DELETE /api/admin/users/{id} — remove a user (cascades the profile via FK).
 * ADMIN ONLY. Self-deletion and last-admin deletion are blocked.
 */
export async function DELETE(_req: Request, ctx: RouteContext) {
  try {
    const admin_ctx = await requireAdmin();
    const { id } = await ctx.params;

    if (id === admin_ctx.id) throw new ApiError(400, "No puedes eliminar tu propia cuenta.");

    const admin = createAdminClient();
    const { data: targetAuth, error: getErr } = await admin.auth.admin.getUserById(id);
    if (getErr || !targetAuth?.user) throw new ApiError(404, "Usuario no encontrado.");

    const { data: targetProfile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", id)
      .maybeSingle();
    if (targetProfile?.role === "admin") {
      const { count } = await admin
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("role", "admin")
        .neq("id", id);
      if ((count ?? 0) === 0) {
        throw new ApiError(400, "No puedes eliminar al último administrador del sistema.");
      }
    }

    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) throw new ApiError(400, error.message);

    return jsonOk({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
