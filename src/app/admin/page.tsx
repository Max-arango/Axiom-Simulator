import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/landing/navbar";
import { AdminDashboard } from "@/components/admin/admin-dashboard";

export const metadata = { title: "Panel de administración" };

/**
 * Dedicated admin panel route (§4). Server-side gated: the page is only
 * rendered for an authenticated user whose profile role is 'admin'; everyone
 * else is redirected home. This is real authorization (not the old #admin
 * in-page anchor, which only existed on the landing and did nothing elsewhere).
 * The /api/admin/* routes independently enforce requireAdmin(), so this gate is
 * defense-in-depth for the UI, not the only check.
 */
export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "admin") redirect("/");

  return (
    <>
      <Navbar />
      <main
        id="main"
        className="relative min-h-[calc(100vh-4rem)] border-t border-line bg-background"
      >
        <div
          aria-hidden="true"
          className="graph-paper pointer-events-none absolute inset-0 opacity-60"
        />
        <div className="relative">
          <AdminDashboard />
        </div>
      </main>
    </>
  );
}
