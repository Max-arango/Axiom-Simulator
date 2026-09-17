import "server-only"; // build-time guard: importing this (service-role) module from a client bundle fails.
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Write a row to public.admin_audit_log through the service role. RLS grants no
 * client insert path (deny by default), so audit rows can only be produced here
 * and are therefore unforgeable. Call after a privileged action succeeds.
 */
export async function writeAudit(entry: {
  actor: string | null;
  target?: string | null;
  action: string;
  metadata?: Record<string, unknown>;
  ipHash?: string | null;
}): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("admin_audit_log").insert({
    actor: entry.actor,
    target: entry.target ?? null,
    action: entry.action,
    metadata: (entry.metadata ?? {}) as never,
    ip_hash: entry.ipHash ?? null,
  });
  if (error) {
    // Never mask the caller's real work behind an audit failure; surface loudly.
    console.error("[ternary-access] audit write failed", error);
  }
}
