import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getServerSupabase } from "./supabase/server";

export type AuthenticatedStaffContext = {
  supabase: NonNullable<Awaited<ReturnType<typeof getServerSupabase>>>;
  user: { id: string; email?: string };
  staff: {
    id: string;
    restaurant_id: string;
    branch_id: string;
    role_id?: string;
    full_name: string;
    active: boolean;
  };
};

export async function getAuthenticatedStaff(): Promise<
  { error: string; status: number } | AuthenticatedStaffContext
> {
  const supabase = await getServerSupabase();
  if (!supabase) {
    return { error: "Database service unavailable", status: 503 };
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user || user.is_anonymous) {
    return { error: "Authentication is required", status: 401 };
  }

  const { data: staff, error: staffError } = await supabase
    .from("staff")
    .select("id, restaurant_id, branch_id, role_id, full_name, active")
    .eq("id", user.id)
    .eq("active", true)
    .maybeSingle();

  if (staffError || !staff) {
    return { error: "An active staff profile is required", status: 403 };
  }

  return { supabase, user, staff };
}

export async function verifyCsrf(request: Request): Promise<boolean> {
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get("csrf_token")?.value;
  const headerToken = request.headers.get("x-csrf-token");
  if (!cookieToken || !headerToken) return false;
  return cookieToken === headerToken;
}

export function jsonError(message: string, status: number, code?: string) {
  return NextResponse.json(
    { error: { message, code: code ?? "request_failed" } },
    { status }
  );
}

export function jsonSuccess<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status });
}
