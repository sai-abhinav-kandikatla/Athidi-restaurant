import { getAuthenticatedStaff, jsonError, jsonSuccess } from "../../../lib/auth-helpers";

export async function GET() {
  const ctx = await getAuthenticatedStaff();
  if ("error" in ctx) {
    return jsonError(ctx.error, ctx.status);
  }

  const { supabase, staff } = ctx;

  const [
    ordersRes,
    requestsRes,
    tablesRes,
    categoriesRes,
    menuRes,
    branchRes,
    restaurantRes,
    paymentsRes,
    auditRes,
  ] = await Promise.all([
    supabase
      .from("orders")
      .select("*, order_items(*), table_session:table_sessions(*, table:tables(*))")
      .eq("branch_id", staff.branch_id)
      .order("placed_at", { ascending: false })
      .limit(100),
    supabase
      .from("notifications")
      .select("*, table_session:table_sessions(*, table:tables(*))")
      .eq("branch_id", staff.branch_id)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("tables")
      .select("*, section:table_sections(*)")
      .eq("branch_id", staff.branch_id)
      .order("number"),
    supabase
      .from("menu_categories")
      .select("*")
      .eq("restaurant_id", staff.restaurant_id)
      .order("sort_order"),
    supabase
      .from("menu_items")
      .select("*, category:menu_categories(*)")
      .eq("restaurant_id", staff.restaurant_id)
      .order("sort_order"),
    supabase
      .from("branches")
      .select("*")
      .eq("id", staff.branch_id)
      .maybeSingle(),
    supabase
      .from("restaurants")
      .select("name, slug")
      .eq("id", staff.restaurant_id)
      .maybeSingle(),
    supabase
      .from("payments")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("audit_logs")
      .select("*")
      .eq("branch_id", staff.branch_id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  return jsonSuccess({
    orders: ordersRes.data ?? [],
    requests: requestsRes.data ?? [],
    tables: tablesRes.data ?? [],
    categories: categoriesRes.data ?? [],
    menu: menuRes.data ?? [],
    branch: branchRes.data ?? null,
    restaurant: restaurantRes.data ?? null,
    payments: paymentsRes.data ?? [],
    audit: auditRes.data ?? [],
    health: {
      connection: "healthy",
      dbTime: new Date().toISOString(),
    },
  });
}
