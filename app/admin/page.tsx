import { redirect } from "next/navigation";
import { defaultAdminRoute, requireAdminAccess } from "../lib/admin-access";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const access = await requireAdminAccess();
  if (!access) {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <span className="auth-kicker">ATHIDHI RESTAURANT OS</span>
          <h1>Backend configuration required</h1>
          <p>Add the Supabase server settings before opening the staff console.</p>
        </section>
      </main>
    );
  }
  redirect(defaultAdminRoute(access.role));
}
