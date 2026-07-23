import { assertCsrf, auditStaffEvent } from "@/app/lib/api/security";
import {
  ApiError,
  apiNoContent,
  apiSuccess,
  handleApiError,
  isUuid,
  optionalEnumValue,
  optionalNumber,
  optionalUuid,
  readJsonObject,
  requireStaff,
  requireStaffRole,
  supabaseError,
} from "@/app/lib/api/server";

export const dynamic = "force-dynamic";
type RouteContext = { params: Promise<{ id: string }> };
const states = [
  "AVAILABLE", "BROWSING", "ORDERING", "ORDER_PLACED", "PREPARING", "READY",
  "DINING", "BILL_REQUESTED", "PAID", "CLEANING",
] as const;

export async function GET(request: Request, context: RouteContext) {
  try {
    const { supabase, staff } = await requireStaff(request, "manage_tables");
    requireStaffRole(staff, ["OWNER", "MANAGER"]);
    const { id } = await context.params;
    validateId(id);
    const result = await supabase
      .from("tables")
      .select("id,branch_id,section_id,number,capacity,qr_token,state,created_at,updated_at,section:sections(id,name)")
      .eq("id", id)
      .eq("branch_id", staff.branchId)
      .single();
    if (result.error) throw supabaseError(result.error);
    return apiSuccess(result.data);
  } catch (problem) {
    return handleApiError(problem);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    assertCsrf(request);
    const { supabase, staff } = await requireStaff(request, "manage_tables");
    requireStaffRole(staff, ["OWNER", "MANAGER"]);
    const { id } = await context.params;
    validateId(id);
    const body = await readJsonObject(request);
    const patch = compact({
      section_id: optionalUuid(body, "sectionId", true),
      number: optionalNumber(body, "number", { integer: true, min: 1, max: 10_000 }),
      capacity: optionalNumber(body, "capacity", { integer: true, min: 1, max: 50 }),
      state: optionalEnumValue(body, "state", states),
    });
    if (!Object.keys(patch).length) {
      throw new ApiError(422, "validation_error", "At least one table field is required.");
    }
    const result = await supabase
      .from("tables")
      .update(patch)
      .eq("id", id)
      .eq("branch_id", staff.branchId)
      .select("id,branch_id,section_id,number,capacity,qr_token,state,created_at,updated_at")
      .single();
    if (result.error) throw supabaseError(result.error, "Unable to update the table.");
    await auditStaffEvent(staff, "TABLE_UPDATED", { fields: Object.keys(patch) }, "table", id);
    return apiSuccess(result.data);
  } catch (problem) {
    return handleApiError(problem);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    assertCsrf(request);
    const { supabase, staff } = await requireStaff(request, "manage_tables");
    requireStaffRole(staff, ["OWNER", "MANAGER"]);
    const { id } = await context.params;
    validateId(id);
    const result = await supabase
      .from("tables")
      .delete()
      .eq("id", id)
      .eq("branch_id", staff.branchId);
    if (result.error) throw supabaseError(result.error, "Unable to delete the table.");
    await auditStaffEvent(staff, "TABLE_DELETED", {}, "table", id);
    return apiNoContent();
  } catch (problem) {
    return handleApiError(problem);
  }
}

function validateId(id: string) {
  if (!isUuid(id)) throw new ApiError(400, "invalid_id", "The table id must be a UUID.");
}

function compact(value: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined));
}
