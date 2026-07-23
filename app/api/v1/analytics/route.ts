import {
  ApiError,
  apiSuccess,
  handleApiError,
  requireStaff,
  requireStaffRole,
  supabaseError,
} from "@/app/lib/api/server";

export const dynamic = "force-dynamic";

type AnalyticsOrder = {
  id: string;
  status: string;
  total: number | string;
  placed_at: string;
  served_at: string | null;
  order_items: { item_name: string; quantity: number; line_total: number | string }[] | null;
};

export async function GET(request: Request) {
  try {
    const { supabase, staff } = await requireStaff(request, "view_analytics");
    requireStaffRole(staff, ["OWNER", "MANAGER"]);
    const url = new URL(request.url);
    const now = new Date();
    const defaultFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const from = parseDate(url.searchParams.get("from"), defaultFrom, "from");
    const to = parseDate(url.searchParams.get("to"), now, "to");
    if (from > to) throw new ApiError(400, "invalid_query", "from must be before to.");
    if (to.getTime() - from.getTime() > 366 * 24 * 60 * 60 * 1000) {
      throw new ApiError(400, "invalid_query", "The analytics range cannot exceed 366 days.");
    }

    const [ordersResult, requestsResult, tablesResult] = await Promise.all([
      supabase
        .from("orders")
        .select("id,status,total,placed_at,served_at,order_items(item_name,quantity,line_total)")
        .eq("branch_id", staff.branchId)
        .gte("placed_at", from.toISOString())
        .lte("placed_at", to.toISOString())
        .order("placed_at", { ascending: false })
        .limit(1000),
      supabase
        .from("notifications")
        .select("id,request_type,status,created_at,acknowledged_at,resolved_at")
        .eq("branch_id", staff.branchId)
        .gte("created_at", from.toISOString())
        .lte("created_at", to.toISOString())
        .limit(1000),
      supabase
        .from("tables")
        .select("id,state")
        .eq("branch_id", staff.branchId),
    ]);
    if (ordersResult.error) throw supabaseError(ordersResult.error, "Unable to load order analytics.");
    if (requestsResult.error) throw supabaseError(requestsResult.error, "Unable to load service analytics.");
    if (tablesResult.error) throw supabaseError(tablesResult.error, "Unable to load table analytics.");

    const orders = (ordersResult.data ?? []) as unknown as AnalyticsOrder[];
    const orderIds = orders.map((order) => order.id);
    const paymentsResult = orderIds.length
      ? await supabase
          .from("payments")
          .select("order_id,amount,status,method,created_at")
          .in("order_id", orderIds)
          .eq("status", "SUCCESS")
          .limit(1000)
      : { data: [], error: null };
    if (paymentsResult.error) throw supabaseError(paymentsResult.error, "Unable to load payment analytics.");

    const payments = paymentsResult.data ?? [];
    const revenue = payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
    const statusCounts = countBy(orders, (order) => order.status);
    const methodTotals: Record<string, number> = {};
    for (const payment of payments) {
      methodTotals[payment.method] = round((methodTotals[payment.method] ?? 0) + Number(payment.amount));
    }

    const dishTotals = new Map<string, { quantity: number; sales: number }>();
    for (const order of orders) {
      for (const item of order.order_items ?? []) {
        const current = dishTotals.get(item.item_name) ?? { quantity: 0, sales: 0 };
        current.quantity += Number(item.quantity);
        current.sales += Number(item.line_total);
        dishTotals.set(item.item_name, current);
      }
    }
    const topDishes = [...dishTotals.entries()]
      .map(([name, values]) => ({ name, quantity: values.quantity, sales: round(values.sales) }))
      .sort((left, right) => right.quantity - left.quantity)
      .slice(0, 10);

    const servedMinutes = orders
      .filter((order) => order.served_at)
      .map((order) => (new Date(order.served_at!).getTime() - new Date(order.placed_at).getTime()) / 60_000)
      .filter((minutes) => Number.isFinite(minutes) && minutes >= 0);
    const requests = requestsResult.data ?? [];
    const resolvedMinutes = requests
      .filter((item) => item.resolved_at)
      .map((item) => (new Date(item.resolved_at!).getTime() - new Date(item.created_at).getTime()) / 60_000)
      .filter((minutes) => Number.isFinite(minutes) && minutes >= 0);
    const tables = tablesResult.data ?? [];
    const occupiedTables = tables.filter((table) => table.state !== "AVAILABLE").length;

    return apiSuccess({
      range: { from: from.toISOString(), to: to.toISOString() },
      revenue: {
        total: round(revenue),
        successfulPayments: payments.length,
        byMethod: methodTotals,
      },
      orders: {
        total: orders.length,
        byStatus: statusCounts,
        averageTicket: round(orders.length ? orders.reduce((sum, order) => sum + Number(order.total), 0) / orders.length : 0),
        averageServiceMinutes: round(average(servedMinutes)),
      },
      dishes: { top: topDishes },
      serviceRequests: {
        total: requests.length,
        byType: countBy(requests, (item) => item.request_type),
        byStatus: countBy(requests, (item) => item.status),
        averageResolutionMinutes: round(average(resolvedMinutes)),
      },
      tables: {
        total: tables.length,
        occupied: occupiedTables,
        available: tables.length - occupiedTables,
        occupancyPercent: round(tables.length ? (occupiedTables / tables.length) * 100 : 0),
      },
    }, 200, {
      truncated: orders.length === 1000 || requests.length === 1000 || payments.length === 1000,
    });
  } catch (problem) {
    return handleApiError(problem);
  }
}

function parseDate(raw: string | null, fallback: Date, field: string) {
  if (!raw) return fallback;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) throw new ApiError(400, "invalid_query", `${field} must be an ISO date.`);
  return date;
}

function countBy<T>(items: T[], key: (item: T) => string) {
  const counts: Record<string, number> = {};
  for (const item of items) counts[key(item)] = (counts[key(item)] ?? 0) + 1;
  return counts;
}

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function round(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
