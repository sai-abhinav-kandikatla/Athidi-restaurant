import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminOS } from "../components/admin-os";
import type { StaffIdentity } from "../lib/restaurant-types";
import { getServerSupabase } from "../lib/supabase/server";

export const metadata: Metadata = {
  title: "Restaurant operations",
  description: "Athidhi restaurant operations dashboard.",
};
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const supabase = await getServerSupabase();
  if (!supabase) {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <span className="auth-kicker">ATHIDHI RESTAURANT OS</span>
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
      .select("id,name")
      .eq("id", staffResult.data.branch_id)
      .single(),
    supabase
      .from("roles")
      .select("id,name,permissions")
      .eq("id", staffResult.data.role_id)
      .single(),
  ]);

  if (!branchResult.data || !roleResult.data) {
    redirect("/admin/login?error=profile");
  }

  const staff: StaffIdentity = {
    id: staffResult.data.id,
    fullName: staffResult.data.full_name,
    restaurantId: staffResult.data.restaurant_id,
    branchId: branchResult.data.id,
    branchName: branchResult.data.name,
    roleName: roleResult.data.name,
    permissions: (roleResult.data.permissions ?? {}) as Record<string, boolean>,
  };

  return <AdminOS staff={staff} />;
}
