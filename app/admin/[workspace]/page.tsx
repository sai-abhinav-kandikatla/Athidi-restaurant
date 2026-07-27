import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AdminOS, type AdminSection } from "../../components/admin-os";
import type { StaffIdentity } from "../../lib/restaurant-types";
import { getServerSupabase } from "../../lib/supabase/server";

export const metadata: Metadata = {
  title: "Restaurant operations",
  description: "Secure Athidi restaurant staff workspace.",
};
export const dynamic = "force-dynamic";

type StaffRole = "OWNER" | "MANAGER" | "CHEF" | "WAITER" | "CASHIER";

const workspaces: Record<string, { section: AdminSection; roles: readonly StaffRole[] }> = {
  dashboard: { section: "Dashboard", roles: ["OWNER", "MANAGER"] },
  orders: { section: "Orders", roles: ["OWNER", "MANAGER"] },
  "live-tables": { section: "Live Tables", roles: ["OWNER", "MANAGER"] },
  kitchen: { section: "Kitchen", roles: ["OWNER", "MANAGER", "CHEF"] },
  waiter: { section: "Waiter", roles: ["OWNER", "MANAGER", "WAITER"] },
  settings: { section: "Settings", roles: ["OWNER", "MANAGER"] },
};

async function requireAdminAccess(allowedRoles: readonly StaffRole[]): Promise<{ staff: StaffIdentity } | null> {
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
    supabase.from("branches").select("id,name").eq("id", staffResult.data.branch_id).single(),
    supabase.from("roles").select("id,name,permissions").eq("id", staffResult.data.role_id).single(),
  ]);

  if (!branchResult.data || !roleResult.data) redirect("/admin/login?error=profile");

  const roleName = roleResult.data.name.toUpperCase() as StaffRole;
  if (!allowedRoles.map((r) => r.toUpperCase()).includes(roleName)) {
    redirect("/admin?error=unauthorized");
  }

  return {
    staff: {
      id: staffResult.data.id,
      fullName: staffResult.data.full_name,
      restaurantId: staffResult.data.restaurant_id,
      branchId: branchResult.data.id,
      branchName: branchResult.data.name,
      roleName: roleResult.data.name,
      permissions: (roleResult.data.permissions ?? {}) as Record<string, boolean>,
    },
  };
}

export default async function AdminWorkspacePage({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace } = await params;
  if (workspace === "billing") {
    const access = await requireAdminAccess(["OWNER", "CASHIER"]);
    if (!access) return <BackendRequired />;
    return (
      <main className="auth-page">
        <section className="auth-card">
          <span className="auth-kicker">SECURE CASHIER WORKSPACE</span>
          <h1>Billing access is ready.</h1>
          <p>The cashier route and permissions are protected. The billing interface will arrive in its dedicated phase.</p>
          <Link href="/admin">Return to your assigned workspace</Link>
        </section>
      </main>
    );
  }
  const definition = workspaces[workspace];
  if (!definition) notFound();
  const access = await requireAdminAccess(definition.roles);
  if (!access) return <BackendRequired />;
  return <AdminOS staff={access.staff} initialSection={definition.section} />;
}

function BackendRequired() {
  return (
    <main className="auth-page">
      <section className="auth-card">
        <h1>Backend configuration required</h1>
        <p>Add the Supabase server settings before opening the staff console.</p>
      </section>
    </main>
  );
}
