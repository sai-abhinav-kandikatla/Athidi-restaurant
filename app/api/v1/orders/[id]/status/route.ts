import { getAuthenticatedStaff, jsonError, jsonSuccess, verifyCsrf } from "../../../../../lib/auth-helpers";

const VALID_TRANSITIONS: Record<string, string[]> = {
  PLACED: ["ACCEPTED", "PREPARING", "CANCELLED"],
  ACCEPTED: ["PREPARING", "CANCELLED"],
  PREPARING: ["READY", "CANCELLED"],
  READY: ["SERVED", "BILLED"],
  SERVED: ["BILLED", "PAID"],
  BILLED: ["PAID"],
  PAID: [],
  CANCELLED: [],
};

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await verifyCsrf(request))) {
    return jsonError("Invalid security token", 403, "csrf_rejected");
  }

  const ctx = await getAuthenticatedStaff();
  if ("error" in ctx) {
    return jsonError(ctx.error, ctx.status);
  }

  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as { status?: string };
  const nextStatus = body.status;

  const validStatuses = [
    "PLACED",
    "ACCEPTED",
    "PREPARING",
    "READY",
    "SERVED",
    "BILLED",
    "PAID",
    "CANCELLED",
  ];

  if (!nextStatus || !validStatuses.includes(nextStatus)) {
    return jsonError("Invalid order status", 400, "invalid_status");
  }

  const { supabase, staff } = ctx;

  const { data: currentOrder } = await supabase
    .from("orders")
    .select("id, status")
    .eq("id", id)
    .eq("branch_id", staff.branch_id)
    .maybeSingle();

  if (!currentOrder) {
    return jsonError("Order not found", 404, "order_not_found");
  }

  const currentStatus = currentOrder.status;
  const allowedNext = VALID_TRANSITIONS[currentStatus] ?? [];

  if (!allowedNext.includes(nextStatus) && currentStatus !== nextStatus) {
    return jsonError(
      `Invalid order status transition from ${currentStatus} to ${nextStatus}`,
      400,
      "invalid_state_transition"
    );
  }

  const updates: Record<string, unknown> = {
    status: nextStatus,
  };

  if (nextStatus === "SERVED") {
    updates.served_at = new Date().toISOString();
  } else if (nextStatus === "PAID") {
    updates.paid_at = new Date().toISOString();
  }

  const { data: updatedOrder, error: updateError } = await supabase
    .from("orders")
    .update(updates)
    .eq("id", id)
    .eq("branch_id", staff.branch_id)
    .select("*, table_session:table_sessions(table_id)")
    .single();

  if (updateError || !updatedOrder) {
    return jsonError(updateError?.message ?? "Order update failed", 400);
  }

  // Record structured audit log
  await supabase.from("audit_logs").insert({
    branch_id: staff.branch_id,
    staff_id: staff.id,
    action: `ORDER_${nextStatus}`,
    data: {
      order_id: id,
      previous_state: currentStatus,
      new_state: nextStatus,
      updated_by: staff.id,
    },
  });

  return jsonSuccess(updatedOrder, 200, "Order status updated successfully");
}
