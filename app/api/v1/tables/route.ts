import { assertCsrf, auditStaffEvent } from "@/app/lib/api/security";
import {
  ApiError,
  apiSuccess,
  handleApiError,
  listOptions,
  optionalNumber,
  optionalUuid,
  readJsonObject,
  requiredNumber,
  requireStaff,
  requireStaffRole,
  supabaseError,
} from "@/app/lib/api/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { supabase, staff } = await requireStaff(request, "manage_tables");
    requireStaffRole(staff, ["OWNER", "MANAGER"]);
    const { limit, offset } = listOptions(request, 250);
    const result = await supabase
      .from("tables")
      .select("id,branch_id,section_id,number,capacity,qr_token,state,created_at,updated_at,section:sections(id,name)")
      .eq("branch_id", staff.branchId)
      .order("number")
      .range(offset, offset + limit - 1);
    if (result.error) throw supabaseError(result.error, "Unable to load tables.");
    return apiSuccess(result.data ?? [], 200, { limit, offset });
  } catch (problem) {
    return handleApiError(problem);
  }
}

export async function POST(request: Request) {
  try {
    assertCsrf(request);
    const { supabase, staff } = await requireStaff(request, "manage_tables");
    requireStaffRole(staff, ["OWNER", "MANAGER"]);
    const body = await readJsonObject(request);
    const number = requiredNumber(body, "number", { integer: true, min: 1, max: 10_000 });
    const capacity = optionalNumber(body, "capacity", { integer: true, min: 1, max: 50 }) ?? 4;
    if (!Number.isInteger(number) || !Number.isInteger(capacity)) {
      throw new ApiError(422, "validation_error", "number and capacity must be integers.");
    }
    const result = await supabase
      .from("tables")
      .insert({
        branch_id: staff.branchId,
        section_id: optionalUuid(body, "sectionId", true) ?? null,
        number,
        capacity,
      })
      .select("id,branch_id,section_id,number,capacity,qr_token,state,created_at,updated_at")
      .single();
    if (result.error) throw supabaseError(result.error, "Unable to create the table.");
    await auditStaffEvent(staff, "TABLE_CREATED", { number }, "table", result.data.id);
    return apiSuccess(result.data, 201);
  } catch (problem) {
    return handleApiError(problem);
  }
}
