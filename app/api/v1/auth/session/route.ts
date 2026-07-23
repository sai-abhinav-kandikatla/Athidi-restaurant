import {
  assertCsrf,
  auditLoginEvent,
  auditStaffEvent,
  enforceRateLimit,
} from "@/app/lib/api/security";
import {
  ApiError,
  apiNoContent,
  apiSuccess,
  getApiSupabase,
  handleApiError,
  readJsonObject,
  requiredString,
  requireUser,
  supabaseError,
} from "@/app/lib/api/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { user, staff } = await requireUser(request);
    return apiSuccess({
      user: { id: user.id, email: user.email ?? null, anonymous: user.is_anonymous },
      staff,
    });
  } catch (problem) {
    return handleApiError(problem);
  }
}

export async function POST(request: Request) {
  try {
    assertCsrf(request);
    const body = await readJsonObject(request);
    const email = requiredString(body, "email", { max: 254 });
    const password = requiredString(body, "password", { min: 6, max: 200 });
    await enforceRateLimit(request, "admin_login", 5, 900, email.trim().toLowerCase());
    const supabase = await getApiSupabase(request);
    const signIn = await supabase.auth.signInWithPassword({ email, password });
    if (signIn.error || !signIn.data.user) {
      await auditLoginEvent("LOGIN_FAILED", email, request);
      throw new ApiError(401, "invalid_credentials", "The email or password is incorrect.");
    }

    const staffResult = await supabase
      .from("staff")
      .select("id,restaurant_id,branch_id,full_name,active,role:roles(name,permissions)")
      .eq("id", signIn.data.user.id)
      .maybeSingle();
    if (staffResult.error) throw supabaseError(staffResult.error, "Unable to load staff access.");

    const rawStaff = staffResult.data as unknown as {
      id: string;
      restaurant_id: string;
      branch_id: string | null;
      full_name: string;
      active: boolean;
      role: { name: string; permissions: Record<string, boolean> } | null;
    } | null;
    if (!rawStaff?.active || !rawStaff.branch_id || !rawStaff.role) {
      await supabase.auth.signOut();
      await auditLoginEvent("LOGIN_FAILED", email, request);
      throw new ApiError(403, "staff_access_required", "This account has no active staff profile.");
    }

    const staff = {
      id: rawStaff.id,
      restaurantId: rawStaff.restaurant_id,
      branchId: rawStaff.branch_id,
      fullName: rawStaff.full_name,
      roleName: rawStaff.role.name,
      permissions: rawStaff.role.permissions ?? {},
    };
    await auditLoginEvent("STAFF_LOGIN", email, request, staff);

    return apiSuccess({
      user: { id: signIn.data.user.id, email: signIn.data.user.email ?? null },
      staff,
      redirectTo: defaultRoute(rawStaff.role.name),
    });
  } catch (problem) {
    return handleApiError(problem);
  }
}

export async function DELETE(request: Request) {
  try {
    assertCsrf(request);
    const { supabase, staff } = await requireUser(request);
    if (staff) await auditStaffEvent(staff, "STAFF_LOGOUT");
    const result = await supabase.auth.signOut();
    if (result.error) throw supabaseError(result.error, "Unable to sign out.");
    return apiNoContent();
  } catch (problem) {
    return handleApiError(problem);
  }
}

function defaultRoute(roleName: string) {
  const role = roleName.trim().toUpperCase();
  if (role === "CHEF" || role === "KITCHEN") return "/admin/kitchen";
  if (role === "WAITER") return "/admin/waiter";
  if (role === "CASHIER") return "/admin/billing";
  return "/admin/dashboard";
}
