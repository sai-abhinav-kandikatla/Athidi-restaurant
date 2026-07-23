import { assertCsrf } from "@/app/lib/api/security";
import {
  ApiError,
  apiSuccess,
  enumValue,
  handleApiError,
  isUuid,
  readJsonObject,
  requireStaff,
  requireStaffRole,
  supabaseError,
} from "@/app/lib/api/server";

export const dynamic = "force-dynamic";
type RouteContext = { params: Promise<{ id: string }> };
const statuses = ["ACCEPTED", "PREPARING", "READY", "SERVED", "BILLED"] as const;

export async function PATCH(request: Request, context: RouteContext) {
  try {
    assertCsrf(request);
    const { supabase, staff } = await requireStaff(request, "manage_orders");
    const role = requireStaffRole(staff, ["OWNER", "MANAGER", "CHEF", "WAITER"]);
    const { id } = await context.params;
    if (!isUuid(id)) throw new ApiError(400, "invalid_id", "The order id must be a UUID.");
    const body = await readJsonObject(request);
    const status = enumValue(body, "status", statuses);
    if (role === "CHEF" && !["ACCEPTED", "PREPARING", "READY"].includes(status)) {
      throw new ApiError(403, "role_forbidden", "Kitchen staff cannot complete waiter or billing steps.");
    }
    if (role === "WAITER" && status !== "SERVED") {
      throw new ApiError(403, "role_forbidden", "Waiters can only confirm that ready food was served.");
    }
    const result = await supabase.rpc("advance_order_status", {
      p_order_id: id,
      p_status: status,
    });
    if (result.error) throw supabaseError(result.error, "Unable to advance the order.");
    return apiSuccess(result.data);
  } catch (problem) {
    return handleApiError(problem);
  }
}
