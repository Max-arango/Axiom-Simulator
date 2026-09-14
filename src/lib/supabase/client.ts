import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./types";

let browserClient: ReturnType<typeof createBrowserClient<Database>> | null = null;

/**
 * Browser Supabase client (anon/publishable key).
 * Lazy initialization: env vars are only validated when the client is first used,
 * allowing `next build` to succeed without Supabase config for public pages.
 */
export function createClient() {
  if (browserClient) return browserClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY (see .env.example)",
    );
  }

  browserClient = createBrowserClient<Database>(url, key);
  return browserClient;
}

/** Reset the cached client (for testing or config changes). */
export function resetClient() {
  browserClient = null;
}
