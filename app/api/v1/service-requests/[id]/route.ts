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
const statuses = ["ACKNOWLEDGED", "RESOLVED"] as const;

export async function PATCH(request: Request, context: RouteContext) {
  try {
    assertCsrf(request);
    const { supabase, staff } = await requireStaff(request, "manage_tables");
    requireStaffRole(staff, ["OWNER", "MANAGER", "WAITER"]);
    const { id } = await context.params;
    if (!isUuid(id)) throw new ApiError(400, "invalid_id", "The service request id must be a UUID.");
    const body = await readJsonObject(request);
    const status = enumValue(body, "status", statuses);
    const result = await supabase.rpc("update_service_request_status", {
      p_request_id: id,
      p_status: status,
    });
    if (result.error) throw supabaseError(result.error, "Unable to update the service request.");
    return apiSuccess(result.data);
  } catch (problem) {
    return handleApiError(problem);
  }
}
