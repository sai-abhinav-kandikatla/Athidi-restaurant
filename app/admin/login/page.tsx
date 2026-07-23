"use client";

import { LoaderCircle, LockKeyhole, LogIn } from "lucide-react";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { Brand } from "../../components/brand";
import { apiRequest } from "../../lib/api/client";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const reason = new URLSearchParams(window.location.search).get("error");
    queueMicrotask(() => {
      if (reason === "access") {
        setError("This account does not have an active Athidhi staff profile.");
      } else if (reason === "profile") {
        setError("The staff profile is incomplete. Ask an owner to update it.");
      } else if (reason === "callback") {
        setError("The sign-in link is invalid or expired. Sign in again.");
      }
    });
  }, []);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await apiRequest<{ redirectTo: string }>("/api/v1/auth/session", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      const requested = new URLSearchParams(window.location.search).get("next");
      const destination = requested?.startsWith("/admin/") && !requested.startsWith("//")
        ? requested
        : result.redirectTo;
      window.location.assign(destination);
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Sign-in could not be completed.");
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <Brand />
        <span className="auth-kicker">SECURE STAFF ACCESS</span>
        <h1>Welcome back.</h1>
        <p>Sign in with the staff account created for you by the restaurant owner.</p>
        <form onSubmit={signIn}>
          <label>
            Email address
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              minLength={6}
              required
            />
          </label>
          {error && <div className="auth-error" role="alert"><LockKeyhole size={17} /> {error}</div>}
          <button type="submit" disabled={busy}>
            {busy ? <LoaderCircle className="spin" size={18} /> : <LogIn size={18} />}
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <Link href="/">Return to the restaurant website</Link>
      </section>
    </main>
  );
}
