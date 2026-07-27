import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminOS } from "../components/admin-os";
import type { StaffIdentity } from "../lib/restaurant-types";
import { canAccessWorkspace, normalizeStaffRole } from "../lib/staff-access";
import { getServerSupabase } from "../lib/supabase/server";

export const metadata: Metadata = {
  title: "Waiter Operations — Staff Console",
  description: "Athidi restaurant waiter console for live floor operations.",
};
export const dynamic = "force-dynamic";

async function getWaiterAccess(): Promise<{ staff: StaffIdentity } | null> {
  const supabase = await getServerSupabase();
  if (!supabase) return null;

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
      .eq("restaurant_id", staffResult.data.restaurant_id)
      .single(),
    supabase
      .from("roles")
      .select("id,name,permissions")
      .eq("id", staffResult.data.role_id)
      .eq("restaurant_id", staffResult.data.restaurant_id)
      .single(),
  ]);

  if (!branchResult.data || !roleResult.data) redirect("/admin/login?error=profile");

  const roleName = normalizeStaffRole(roleResult.data.name);
  if (!roleName || !canAccessWorkspace(roleName, "waiter")) {
    redirect("/admin/login?error=access");
  }

  return {
    staff: {
      id: staffResult.data.id,
      fullName: staffResult.data.full_name,
      restaurantId: staffResult.data.restaurant_id,
      branchId: branchResult.data.id,
      branchName: branchResult.data.name,
      roleName,
      permissions: (roleResult.data.permissions ?? {}) as Record<string, boolean>,
    },
  };
}

export default async function WaiterPage() {
  const access = await getWaiterAccess();
  if (!access) {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <h1>Backend configuration required</h1>
          <p>Add the Supabase server settings before opening the waiter console.</p>
        </section>
      </main>
    );
  }
  return <AdminOS staff={access.staff} initialSection="Waiter" />;
}
