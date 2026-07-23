import { NextResponse } from "next/server";
import { getServerSupabase } from "../../lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next");
  const destination = next?.startsWith("/") ? next : "/admin";
  const supabase = await getServerSupabase();

  if (!supabase || !code) {
    return NextResponse.redirect(new URL("/admin/login?error=callback", url.origin));
  }

  const result = await supabase.auth.exchangeCodeForSession(code);
  if (result.error) {
    return NextResponse.redirect(new URL("/admin/login?error=callback", url.origin));
  }
  return NextResponse.redirect(new URL(destination, url.origin));
}
