import { getAuthenticatedStaff, jsonError, jsonSuccess, verifyCsrf } from "../../../../lib/auth-helpers";

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

  if (body.status !== "RESOLVED") {
    return jsonError("Invalid status transition", 400);
  }

  const { supabase, staff } = ctx;

  const { data: updatedReq, error: updateError } = await supabase
    .from("notifications")
    .update({
      status: "RESOLVED",
      resolved_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("branch_id", staff.branch_id)
    .select()
    .single();

  if (updateError || !updatedReq) {
    return jsonError(updateError?.message ?? "Service request not found", 400);
  }

  await supabase.from("audit_logs").insert({
    branch_id: staff.branch_id,
    staff_id: staff.id,
    action: "REQUEST_RESOLVED",
    data: { request_id: id, type: updatedReq.request_type },
  });

  return jsonSuccess(updatedReq);
}
