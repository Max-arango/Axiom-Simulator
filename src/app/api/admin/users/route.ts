import { requireAdmin, handleApiError, jsonOk, readJson, ApiError } from "@/lib/admin/api";
import { createAdminClient, toAdminUser } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function makeUsername(name: string | undefined, email: string): string {
  let u = (name || email.split("@")[0] || "user").toLowerCase().replace(/[^a-z0-9_]/g, "_").slice(0, 32);
  if (u.length < 3) u = (u + "user").slice(0, 32);
  return u;
}

/**
 * GET /api/admin/users — every user with profile role, permissions and email.
 * ADMIN ONLY. activeSessions is always 0 (not exposed by the Supabase admin API).
 */
export async function GET() {
  try {
    await requireAdmin();
    const admin = createAdminClient();

    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const users = list?.users ?? [];

    const { data: profiles } = await admin.from("profiles").select("id, display_name, role");
    const { data: perms } = await admin.from("permissions").select("user_id, key");

    const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));
    const permsByUser = new Map<string, string[]>();
    for (const row of perms ?? []) {
      const arr = permsByUser.get(row.user_id) ?? [];
      arr.push(row.key);
      permsByUser.set(row.user_id, arr);
    }

    const mapped = users
      .map((u) => toAdminUser(u, profileById.get(u.id) ?? null, permsByUser.get(u.id) ?? []))
      .sort((a, b) => (b.createdAt < a.createdAt ? -1 : b.createdAt > a.createdAt ? 1 : 0));

    return jsonOk({ users: mapped });
  } catch (err) {
    return handleApiError(err);
  }
}

/**
 * POST /api/admin/users — create a user (Supabase Auth admin), set role.
 * The handle_new_user trigger provisions the profile; role is bumped after.
 */
export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = (await readJson(req)) as Record<string, unknown> | null;
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const name = typeof body?.name === "string" && body.name.trim().length >= 2 ? body.name.trim() : undefined;
    const password = typeof body?.password === "string" ? body.password : "";
    const role = body?.role === "ADMIN" ? "ADMIN" : body?.role === "USER" ? "USER" : null;

    if (!EMAIL_RE.test(email)) throw new ApiError(400, "Correo electrónico inválido.");
    if (password.length < 8) throw new ApiError(400, "La contraseña debe tener al menos 8 caracteres.");
    if (!role) throw new ApiError(400, "Rol inválido.");

    const admin = createAdminClient();
    const username = makeUsername(name, email);
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: name ?? null, username },
    });
    if (error || !data?.user) {
      const msg = error?.message ?? "No se pudo crear el usuario.";
      if (/already|registered|exists/i.test(msg)) throw new ApiError(409, "Este correo ya está registrado.");
      throw new ApiError(400, msg);
    }

    if (role === "ADMIN") {
      await admin.from("profiles").update({ role: "admin" }).eq("id", data.user.id);
    }
    const { data: profile } = await admin
      .from("profiles")
      .select("display_name, role")
      .eq("id", data.user.id)
      .maybeSingle();

    return jsonOk({ user: toAdminUser(data.user, profile, []) }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
