"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Client hook for UX gating ONLY (hiding/showing experimental UI). The real
 * gate is server-side (requireTernaryBeta); never trust this for authorization.
 * Calls the same has_ternary_beta_access predicate via the anon client.
 */
export function useTernaryAccess(): { hasAccess: boolean; loading: boolean } {
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data } = await createClient().rpc("has_ternary_beta_access");
        if (active) setHasAccess(data === true);
      } catch {
        if (active) setHasAccess(false);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return { hasAccess, loading };
}
