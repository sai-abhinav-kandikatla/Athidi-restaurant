import { assertCsrf, auditStaffEvent } from "@/app/lib/api/security";
import {
  ApiError,
  apiNoContent,
  apiSuccess,
  handleApiError,
  isUuid,
  optionalBoolean,
  optionalNumber,
  optionalString,
  optionalUuid,
  readJsonObject,
  requireStaff,
  requireStaffRole,
  slugify,
  supabaseError,
} from "@/app/lib/api/server";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    const { supabase, staff } = await requireStaff(request, "manage_menu");
    requireStaffRole(staff, ["OWNER", "MANAGER"]);
    const { id } = await context.params;
    validateId(id);
    const result = await supabase
      .from("menu_categories")
      .select("id,restaurant_id,parent_id,name,slug,sort_order,active")
      .eq("id", id)
      .eq("restaurant_id", staff.restaurantId)
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
    const { supabase, staff } = await requireStaff(request, "manage_menu");
    requireStaffRole(staff, ["OWNER", "MANAGER"]);
    const { id } = await context.params;
    validateId(id);
    const body = await readJsonObject(request);
    const name = optionalString(body, "name", { max: 100 });
    const patch = compact({
      parent_id: optionalUuid(body, "parentId", true),
      name,
      slug: optionalString(body, "slug", { max: 80 }) || (name ? slugify(name) : undefined),
      sort_order: optionalNumber(body, "sortOrder", { integer: true, min: 0 }),
      active: optionalBoolean(body, "active"),
    });
    if (!Object.keys(patch).length) {
      throw new ApiError(422, "validation_error", "At least one category field is required.");
    }
    const result = await supabase
      .from("menu_categories")
      .update(patch)
      .eq("id", id)
      .eq("restaurant_id", staff.restaurantId)
      .select("id,restaurant_id,parent_id,name,slug,sort_order,active")
      .single();
    if (result.error) throw supabaseError(result.error, "Unable to update the menu category.");
    await auditStaffEvent(staff, "MENU_CATEGORY_UPDATED", { fields: Object.keys(patch) }, "menu_category", id);
    return apiSuccess(result.data);
  } catch (problem) {
    return handleApiError(problem);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    assertCsrf(request);
    const { supabase, staff } = await requireStaff(request, "manage_menu");
    requireStaffRole(staff, ["OWNER", "MANAGER"]);
    const { id } = await context.params;
    validateId(id);
    const result = await supabase
      .from("menu_categories")
      .delete()
      .eq("id", id)
      .eq("restaurant_id", staff.restaurantId);
    if (result.error) throw supabaseError(result.error, "Unable to delete the menu category.");
    await auditStaffEvent(staff, "MENU_CATEGORY_DELETED", {}, "menu_category", id);
    return apiNoContent();
  } catch (problem) {
    return handleApiError(problem);
  }
}

function validateId(id: string) {
  if (!isUuid(id)) throw new ApiError(400, "invalid_id", "The category id must be a UUID.");
}

function compact(value: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined));
}
