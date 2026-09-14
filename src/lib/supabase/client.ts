import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./types";

/** Browser Supabase client (anon/publishable key). Env is read inside the
 *  factory so `next build` with no env configured does not crash at import. */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY (see .env.example)",
    );
  }
  return createBrowserClient<Database>(url, key);
}
