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
  supabaseError,
} from "@/app/lib/api/server";

export const dynamic = "force-dynamic";

const select =
  "id,restaurant_id,category_id,name,description,price,is_veg,available,bestseller,image_url,sort_order,category:menu_categories(id,name,slug)";
type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    const { supabase, staff } = await requireStaff(request, "manage_menu");
    requireStaffRole(staff, ["OWNER", "MANAGER"]);
    const { id } = await context.params;
    validateId(id);
    const result = await supabase
      .from("menu_items")
      .select(select)
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
    const patch = compact({
      category_id: optionalUuid(body, "categoryId"),
      name: optionalString(body, "name", { max: 120 }),
      description: optionalString(body, "description", { max: 500, nullable: true }),
      price: optionalNumber(body, "price", { min: 0, max: 1_000_000 }),
      is_veg: optionalBoolean(body, "isVeg"),
      available: optionalBoolean(body, "available"),
      bestseller: optionalBoolean(body, "bestseller"),
      image_url: optionalString(body, "imageUrl", { max: 1000, nullable: true }),
      sort_order: optionalNumber(body, "sortOrder", { integer: true, min: 0 }),
    });
    if (!Object.keys(patch).length) {
      throw new ApiError(422, "validation_error", "At least one dish field is required.");
    }
    const result = await supabase
      .from("menu_items")
      .update(patch)
      .eq("id", id)
      .eq("restaurant_id", staff.restaurantId)
      .select(select)
      .single();
    if (result.error) throw supabaseError(result.error, "Unable to update the menu dish.");
    await auditStaffEvent(staff, "MENU_ITEM_UPDATED", { fields: Object.keys(patch) }, "menu_item", id);
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
      .from("menu_items")
      .delete()
      .eq("id", id)
      .eq("restaurant_id", staff.restaurantId);
    if (result.error) throw supabaseError(result.error, "Unable to delete the menu dish.");
    await auditStaffEvent(staff, "MENU_ITEM_DELETED", {}, "menu_item", id);
    return apiNoContent();
  } catch (problem) {
    return handleApiError(problem);
  }
}

function validateId(id: string) {
  if (!isUuid(id)) throw new ApiError(400, "invalid_id", "The dish id must be a UUID.");
}

function compact(value: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined));
}
