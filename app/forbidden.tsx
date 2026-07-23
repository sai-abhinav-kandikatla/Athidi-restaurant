import Link from "next/link";

export default function Forbidden() {
  return (
    <main className="auth-page">
      <section className="auth-card">
        <span className="auth-kicker">403 · FORBIDDEN</span>
        <h1>This workspace is not assigned to your role.</h1>
        <p>Ask the restaurant owner if your staff permissions should be changed.</p>
        <Link href="/admin">Return to your workspace</Link>
      </section>
    </main>
  );
}
