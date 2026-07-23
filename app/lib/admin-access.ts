import { forbidden, redirect } from "next/navigation";
import type { StaffIdentity } from "./restaurant-types";
import { normalizeStaffRole, type StaffRole } from "./api/server";
import { getServerSupabase } from "./supabase/server";

export async function requireAdminAccess(allowedRoles?: readonly StaffRole[]) {
  const supabase = await getServerSupabase();
  if (!supabase) return null;
  const userResult = await supabase.auth.getUser();
  const user = userResult.data.user;
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
      .select("id,name,restaurant_id")
      .eq("id", staffResult.data.branch_id)
      .eq("restaurant_id", staffResult.data.restaurant_id)
      .single(),
    supabase
      .from("roles")
      .select("id,name,permissions,restaurant_id")
      .eq("id", staffResult.data.role_id)
      .eq("restaurant_id", staffResult.data.restaurant_id)
      .single(),
  ]);
  if (!branchResult.data || !roleResult.data) redirect("/admin/login?error=profile");

  const role = normalizeStaffRole(roleResult.data.name);
  if (!role || (allowedRoles && !allowedRoles.includes(role))) forbidden();

  const staff: StaffIdentity = {
    id: staffResult.data.id,
    fullName: staffResult.data.full_name,
    restaurantId: staffResult.data.restaurant_id,
    branchId: branchResult.data.id,
    branchName: branchResult.data.name,
    roleName: role,
    permissions: (roleResult.data.permissions ?? {}) as Record<string, boolean>,
  };
  return { staff, role };
}

export function defaultAdminRoute(role: StaffRole) {
  if (role === "CHEF") return "/admin/kitchen";
  if (role === "WAITER") return "/admin/waiter";
  if (role === "CASHIER") return "/admin/billing";
  return "/admin/dashboard";
}

