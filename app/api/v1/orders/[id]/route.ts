import { hasTableSessionCredential, requireTableSession } from "@/app/lib/api/security";
import {
  ApiError,
  apiSuccess,
  handleApiError,
  isUuid,
  requireUser,
  supabaseError,
} from "@/app/lib/api/server";

export const dynamic = "force-dynamic";
type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    if (!isUuid(id)) throw new ApiError(400, "invalid_id", "The order id must be a UUID.");
    const tableAccess = hasTableSessionCredential(request) ? await requireTableSession(request) : null;
    const supabase = tableAccess ? tableAccess.admin : (await requireUser(request)).supabase;
    let query = supabase
      .from("orders")
      .select("id,order_number,branch_id,table_session_id,status,subtotal,parcel_charge,tax,total,notes,spice_level,placed_at,accepted_at,preparing_at,ready_at,served_at,billed_at,paid_at,cancelled_at,order_items(*),table_session:table_sessions(id,table:tables(id,number))")
      .eq("id", id);
    if (tableAccess) query = query.eq("table_session_id", tableAccess.session.id);
    const result = await query.single();
    if (result.error) throw supabaseError(result.error);
    return apiSuccess(result.data);
  } catch (problem) {
    return handleApiError(problem);
  }
}
