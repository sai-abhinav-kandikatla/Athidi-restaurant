import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  defaultWorkspaceForRole,
  normalizeStaffRole,
} from "../lib/staff-access";
import { getServerSupabase } from "../lib/supabase/server";

export const metadata: Metadata = {
  title: "Restaurant operations",
  description: "Athidi restaurant operations dashboard.",
};
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const supabase = await getServerSupabase();
  if (!supabase) {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <span className="auth-kicker">ATHIDI RESTAURANT OS</span>
          <h1>Backend configuration required</h1>
          <p>
            Add the Supabase project URL and anonymous key to the application
            environment before opening the staff console.
          </p>
        </section>
      </main>
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.is_anonymous) redirect("/admin/login");

  const staffResult = await supabase
    .from("staff")
    .select("id,restaurant_id,branch_id,role_id,full_name,active")
    .eq("id", user.id)
    .eq("active", true)
    .maybeSingle();
  if (!staffResult.data) redirect("/admin/login?error=access");

  const [branchResult, roleResult] = await Promise.all([
    supabase
      .from("branches")
      .select("id")
      .eq("id", staffResult.data.branch_id)
      .eq("restaurant_id", staffResult.data.restaurant_id)
      .single(),
    supabase
      .from("roles")
      .select("id,name")
      .eq("id", staffResult.data.role_id)
      .eq("restaurant_id", staffResult.data.restaurant_id)
      .single(),
  ]);

  if (!branchResult.data || !roleResult.data) {
    redirect("/admin/login?error=profile");
  }

  const role = normalizeStaffRole(roleResult.data.name);
  const workspace = defaultWorkspaceForRole(role);
  if (!workspace) redirect("/admin/login?error=access");

  redirect(`/admin/${workspace}`);
}
