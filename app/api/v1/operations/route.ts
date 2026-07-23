import {
  ApiError,
  apiSuccess,
  handleApiError,
  normalizeStaffRole,
  requireStaff,
  supabaseError,
} from "@/app/lib/api/server";
import { getServiceSupabase } from "@/app/lib/supabase/admin";

export const dynamic = "force-dynamic";

const waiterActivityActions = [
  "ORDER_READY",
  "FOOD_READY",
  "FOOD_SERVED",
  "DELIVERY_COMPLETED",
  "REQUEST_CREATED",
  "REQUEST_ACKNOWLEDGED",
  "REQUEST_RESOLVED",
  "WAITER_ASSIGNED",
  "WAITER_UNASSIGNED",
  "WAITER_RESPONSE",
] as const;

export async function GET(request: Request) {
  try {
    const { supabase, staff } = await requireStaff(request);
    const serviceSupabase = getServiceSupabase();
    const role = normalizeStaffRole(staff.roleName);
    if (!role) throw new ApiError(403, "role_forbidden", "The staff role is not supported.");
    const management = role === "OWNER" || role === "MANAGER";
    const paymentAccess = management || role === "CASHIER";
    const serviceAccess = management || role === "WAITER";

    const ordersQuery = supabase
      .from("orders")
      .select("id,order_number,branch_id,table_session_id,status,subtotal,parcel_charge,tax,total,notes,spice_level,placed_at,accepted_at,preparing_at,ready_at,served_at,billed_at,paid_at,cancelled_at,order_items(*),table_session:table_sessions(id,opened_at,state,table:tables(id,number))")
      .eq("branch_id", staff.branchId)
      .order("placed_at", { ascending: false })
      .limit(500);
    const tablesQuery = supabase
      .from("tables")
      .select("id,branch_id,section_id,number,capacity,qr_token,state")
      .eq("branch_id", staff.branchId)
      .order("number");
    const requestsQuery = serviceAccess
      ? supabase
          .from("notifications")
          .select("id,branch_id,table_session_id,request_type,status,priority,created_at,acknowledged_at,resolved_at,table_session:table_sessions(id,table:tables(id,number))")
          .eq("branch_id", staff.branchId)
          .order("created_at", { ascending: false })
          .limit(500)
      : Promise.resolve({ data: [], error: null });
    const categoriesQuery = management
      ? supabase
          .from("menu_categories")
          .select("id,restaurant_id,name,slug,sort_order,active")
          .eq("restaurant_id", staff.restaurantId)
          .order("sort_order")
      : Promise.resolve({ data: [], error: null });
    const menuQuery = management
      ? supabase
          .from("menu_items")
          .select("id,restaurant_id,category_id,name,description,price,is_veg,available,bestseller,image_url,sort_order,category:menu_categories(id,name,slug)")
          .eq("restaurant_id", staff.restaurantId)
          .order("sort_order")
      : Promise.resolve({ data: [], error: null });
    const paymentsQuery = paymentAccess
      ? supabase
          .from("payments")
          .select("id,order_id,method,amount,status,created_at")
          .order("created_at", { ascending: false })
          .limit(500)
      : Promise.resolve({ data: [], error: null });
    const restaurantQuery = management
      ? supabase
          .from("restaurants")
          .select("id,name,phone,whatsapp")
          .eq("id", staff.restaurantId)
          .single()
      : Promise.resolve({ data: null, error: null });
    const branchQuery = supabase
      .from("branches")
      .select("id,name,address,timezone,opens_at,closes_at,gstin,tax_rate,qr_ordering_enabled,parcel_charge_enabled,realtime_alerts_enabled")
      .eq("id", staff.branchId)
      .single();
    const managementAuditQuery = management
      ? supabase
          .from("activity_logs")
          .select("id,action,entity_type,entity_id,data,created_at")
          .eq("restaurant_id", staff.restaurantId)
          .eq("branch_id", staff.branchId)
          .order("created_at", { ascending: false })
          .limit(250)
      : null;
    const waiterAuditQuery = serviceAccess && serviceSupabase
      ? serviceSupabase
          .from("activity_logs")
          .select("id,action,entity_type,entity_id,data,created_at")
          .eq("restaurant_id", staff.restaurantId)
          .eq("branch_id", staff.branchId)
          .in("action", waiterActivityActions)
          .order("created_at", { ascending: false })
          .limit(250)
      : null;
    const auditQuery = managementAuditQuery ?? waiterAuditQuery
      ?? Promise.resolve({ data: [], error: null });
    const assignmentsQuery = serviceAccess && serviceSupabase
      ? serviceSupabase
          .from("activity_logs")
          .select("id,staff_id,action,entity_type,entity_id,data,created_at")
          .eq("restaurant_id", staff.restaurantId)
          .eq("branch_id", staff.branchId)
          .in("action", ["WAITER_ASSIGNED", "WAITER_UNASSIGNED"])
          .order("id", { ascending: false })
          .limit(500)
      : Promise.resolve({ data: [], error: null });

    const [orders, tables, requests, categories, menu, payments, restaurant, branch, audit, assignments] = await Promise.all([
      ordersQuery,
      tablesQuery,
      requestsQuery,
      categoriesQuery,
      menuQuery,
      paymentsQuery,
      restaurantQuery,
      branchQuery,
      auditQuery,
      assignmentsQuery,
    ]);
    const firstError = [orders.error, tables.error, requests.error, categories.error, menu.error, payments.error, restaurant.error, branch.error, audit.error, assignments.error].find(Boolean);
    if (firstError) throw supabaseError(firstError, "The operations workspace could not be loaded.");
    if (!branch.data) throw new ApiError(503, "branch_unavailable", "The assigned branch could not be loaded.");

    const waiterMetrics = calculateWaiterMetrics(
      orders.data ?? [],
      requests.data ?? [],
      branch.data.timezone,
    );

    return apiSuccess({
      serverTime: new Date().toISOString(),
      orders: orders.data ?? [],
      requests: requests.data ?? [],
      tables: tables.data ?? [],
      categories: categories.data ?? [],
      menu: menu.data ?? [],
      payments: payments.data ?? [],
      restaurant: restaurant.data,
      branch: branch.data,
      audit: audit.data ?? [],
      assignments: currentAssignments(
        assignments.data ?? [],
        orders.data ?? [],
        requests.data ?? [],
      ),
      waiterMetrics,
      health: {
        authentication: "healthy",
        database: "healthy",
        realtime: branch.data.realtime_alerts_enabled ? "healthy" : "disabled",
        notifications: branch.data.realtime_alerts_enabled ? "healthy" : "disabled",
        connection: "healthy",
      },
    });
  } catch (problem) {
    return handleApiError(problem);
  }
}

type AssignmentEvent = {
  staff_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  data: unknown;
  created_at: string;
};

function currentAssignments(
  events: AssignmentEvent[],
  orders: { id: string; status: string }[],
  requests: { id: string; status: string }[],
) {
  const seen = new Set<string>();
  const activeOrderIds = new Set(
    orders.filter((order) => order.status === "READY").map((order) => order.id),
  );
  const activeRequestIds = new Set(
    requests.filter((item) => item.status !== "RESOLVED").map((item) => item.id),
  );
  const assignments: {
    entityType: "order" | "service_request";
    entityId: string;
    assignedStaffId: string;
    assignedStaffName: string;
    assignedAt: string;
  }[] = [];

  for (const event of events) {
    if (
      !event.entity_id ||
      (event.entity_type !== "order" && event.entity_type !== "service_request")
    ) {
      continue;
    }
    const key = `${event.entity_type}:${event.entity_id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (event.action !== "WAITER_ASSIGNED" || !event.staff_id) continue;
    const active = event.entity_type === "order"
      ? activeOrderIds.has(event.entity_id)
      : activeRequestIds.has(event.entity_id);
    if (!active) continue;
    const data = isRecord(event.data) ? event.data : {};
    assignments.push({
      entityType: event.entity_type,
      entityId: event.entity_id,
      assignedStaffId: event.staff_id,
      assignedStaffName:
        typeof data.assignedStaffName === "string" ? data.assignedStaffName : "Assigned waiter",
      assignedAt: event.created_at,
    });
  }
  return assignments;
}

type WaiterMetricOrder = {
  status: string;
  ready_at: string | null;
  served_at: string | null;
};

type WaiterMetricRequest = {
  request_type: string;
  status: string;
  created_at: string;
  acknowledged_at: string | null;
  resolved_at: string | null;
};

function calculateWaiterMetrics(
  orders: WaiterMetricOrder[],
  requests: WaiterMetricRequest[],
  timeZone: string,
) {
  const now = new Date();
  const todayOrders = orders.filter(
    (order) => order.served_at && isSameOperationalDay(order.served_at, now, timeZone),
  );
  const todayResolvedRequests = requests.filter(
    (item) => item.resolved_at && isSameOperationalDay(item.resolved_at, now, timeZone),
  );
  const deliverySeconds = todayOrders
    .filter((order) => order.ready_at)
    .map((order) => elapsedSeconds(order.ready_at!, order.served_at!))
    .filter(isValidDuration);

  const responseSeconds = (type: string) =>
    todayResolvedRequests
      .filter((item) => item.request_type === type)
      .map((item) => elapsedSeconds(item.created_at, item.acknowledged_at ?? item.resolved_at!))
      .filter(isValidDuration);

  const pendingReadyOrders = orders.filter((order) => order.status === "READY").length;
  const pendingServiceRequests = requests.filter((item) => item.status !== "RESOLVED").length;

  return {
    asOf: now.toISOString(),
    todayDeliveries: todayOrders.length,
    averageFoodDeliverySeconds: roundedAverage(deliverySeconds),
    averageWaterResponseSeconds: roundedAverage(responseSeconds("WATER")),
    averageBillResponseSeconds: roundedAverage(responseSeconds("BILL")),
    averageWaiterResponseSeconds: roundedAverage(responseSeconds("WAITER")),
    pendingReadyOrders,
    pendingServiceRequests,
    activeWaiterTasks: pendingReadyOrders + pendingServiceRequests,
    pendingTasks: pendingReadyOrders + pendingServiceRequests,
    completedTasks: todayOrders.length + todayResolvedRequests.length,
  };
}

function isSameOperationalDay(value: string, now: Date, timeZone: string) {
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return formatter.format(new Date(value)) === formatter.format(now);
  } catch {
    return new Date(value).toISOString().slice(0, 10) === now.toISOString().slice(0, 10);
  }
}

function elapsedSeconds(from: string, to: string) {
  return (new Date(to).getTime() - new Date(from).getTime()) / 1000;
}

function isValidDuration(value: number) {
  return Number.isFinite(value) && value >= 0;
}

function roundedAverage(values: number[]) {
  if (!values.length) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
