import { NextResponse } from "next/server";
import { adminUrl, safeRedirectPath } from "../../lib/site-url";
import { getServerSupabase } from "../../lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next");
  const destination = safeRedirectPath(next, "/admin");
  const supabase = await getServerSupabase();

  if (!supabase || !code) {
    return NextResponse.redirect(adminUrl("/admin/login?error=callback"));
  }

  const result = await supabase.auth.exchangeCodeForSession(code);
  if (result.error) {
    return NextResponse.redirect(adminUrl("/admin/login?error=callback"));
  }
  return NextResponse.redirect(adminUrl(destination));
}
