import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminOS, type AdminSection } from "../../components/admin-os";
import { requireAdminAccess } from "../../lib/admin-access";
import type { StaffRole } from "../../lib/api/server";

export const metadata: Metadata = {
  title: "Restaurant operations",
  description: "Secure Athidhi restaurant staff workspace.",
};
export const dynamic = "force-dynamic";

const workspaces: Record<string, { section: AdminSection; roles: readonly StaffRole[] }> = {
  dashboard: { section: "Dashboard", roles: ["OWNER", "MANAGER"] },
  orders: { section: "Orders", roles: ["OWNER", "MANAGER"] },
  "live-tables": { section: "Live Tables", roles: ["OWNER", "MANAGER"] },
  kitchen: { section: "Kitchen", roles: ["OWNER", "MANAGER", "CHEF"] },
  waiter: { section: "Waiter", roles: ["OWNER", "MANAGER", "WAITER"] },
  settings: { section: "Settings", roles: ["OWNER", "MANAGER"] },
};

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

