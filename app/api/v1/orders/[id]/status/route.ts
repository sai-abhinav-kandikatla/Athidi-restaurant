import { getAuthenticatedStaff, jsonError, jsonSuccess, verifyCsrf } from "../../../../../lib/auth-helpers";

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
    return jsonError("Invalid order status", 400);
  }

  const { supabase, staff } = ctx;

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
    return jsonError(updateError?.message ?? "Order not found", 400);
  }

  // Record audit log
  await supabase.from("audit_logs").insert({
    branch_id: staff.branch_id,
    staff_id: staff.id,
    action: `ORDER_${nextStatus}`,
    data: { order_id: id, status: nextStatus },
  });

  return jsonSuccess(updatedOrder);
}
