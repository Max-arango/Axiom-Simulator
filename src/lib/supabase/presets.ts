import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables, TablesInsert } from "./types";

type Client = SupabaseClient<Database>;
export type Preset = Tables<"presets">;
export type Workspace = Preset["workspace"];

/** Presets owned by the current user (RLS scopes to auth.uid()). Optionally
 *  filter to one workspace. Newest first. */
export async function listMyPresets(supabase: Client, workspace?: Workspace) {
  let q = supabase.from("presets").select("*").order("updated_at", { ascending: false });
  if (workspace) q = q.eq("workspace", workspace);
  const { data, error } = await q;
  if (error) throw error;
  return data;
}

/** Public presets for a workspace, shareable across users (RLS allows
 *  visibility = 'public'). */
export async function listPublicPresets(supabase: Client, workspace: Workspace) {
  const { data, error } = await supabase
    .from("presets")
    .select("*")
    .eq("workspace", workspace)
    .eq("visibility", "public")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data;
}

/** Create a preset owned by the signed-in user. user_id is set from the session,
 *  never from the caller (RLS insert check is user_id = auth.uid()). */
export async function createPreset(
  supabase: Client,
  input: Omit<TablesInsert<"presets">, "user_id" | "id">,
) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Not authenticated");
  const { data, error } = await supabase
    .from("presets")
    .insert({ ...input, user_id: auth.user.id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Delete one of the current user's presets (RLS enforces ownership/admin). */
export async function deletePreset(supabase: Client, id: string) {
  const { error } = await supabase.from("presets").delete().eq("id", id);
  if (error) throw error;
}
