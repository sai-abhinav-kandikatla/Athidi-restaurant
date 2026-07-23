import { assertCsrf } from "@/app/lib/api/security";
import {
  ApiError,
  apiSuccess,
  enumValue,
  handleApiError,
  isUuid,
  optionalBoolean,
  readJsonObject,
  requireStaff,
  requireStaffRole,
  supabaseError,
} from "@/app/lib/api/server";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };
const entityTypes = ["order", "service_request"] as const;

export async function PATCH(request: Request, context: RouteContext) {
  try {
    assertCsrf(request);
    const { supabase, staff } = await requireStaff(request, "manage_tables");
    requireStaffRole(staff, ["OWNER", "MANAGER", "WAITER"]);
    const { id } = await context.params;
    if (!isUuid(id)) throw new ApiError(400, "invalid_id", "The waiter task id must be a UUID.");
    const body = await readJsonObject(request);
    const entityType = enumValue(body, "entityType", entityTypes);
    const assigned = optionalBoolean(body, "assigned") ?? true;
    const result = await supabase.rpc("set_waiter_task_assignment", {
      p_entity_type: entityType,
      p_entity_id: id,
      p_assigned: assigned,
    });
    if (result.error) throw supabaseError(result.error, "Unable to update the waiter assignment.");
    return apiSuccess(result.data);
  } catch (problem) {
    return handleApiError(problem);
  }
}
