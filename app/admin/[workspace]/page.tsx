import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AdminOS, type AdminSection } from "../../components/admin-os";
import type { StaffIdentity } from "../../lib/restaurant-types";
import {
  type AdminWorkspace,
  canAccessWorkspace,
  defaultWorkspaceForRole,
  isAdminWorkspace,
  normalizeStaffRole,
} from "../../lib/staff-access";
import { getServerSupabase } from "../../lib/supabase/server";

export const metadata: Metadata = {
  title: "Restaurant operations",
  description: "Secure Athidi restaurant staff workspace.",
};
export const dynamic = "force-dynamic";

const workspaces = {
  dashboard: { section: "Dashboard" },
  orders: { section: "Orders" },
  "live-tables": { section: "Live Tables" },
  kitchen: { section: "Kitchen" },
  waiter: { section: "Waiter" },
  settings: { section: "Settings" },
} satisfies Partial<Record<AdminWorkspace, { section: AdminSection }>>;

async function requireAdminAccess(
  workspace: AdminWorkspace,
): Promise<{ staff: StaffIdentity } | null> {
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
  if (!roleName) redirect("/admin/login?error=access");
  if (!canAccessWorkspace(roleName, workspace)) {
    const fallback = defaultWorkspaceForRole(roleName);
    if (!fallback) redirect("/admin/login?error=access");
    redirect(`/admin/${fallback}?error=unauthorized`);
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

export default async function AdminWorkspacePage({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace } = await params;
  if (!isAdminWorkspace(workspace)) notFound();
  if (workspace === "billing") {
    const access = await requireAdminAccess(workspace);
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
  const access = await requireAdminAccess(workspace);
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
