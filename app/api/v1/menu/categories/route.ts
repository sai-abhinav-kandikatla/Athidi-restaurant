import { assertCsrf, auditStaffEvent } from "@/app/lib/api/security";
import {
  RESTAURANT_SLUG,
  apiSuccess,
  getApiSupabase,
  handleApiError,
  optionalBoolean,
  optionalNumber,
  optionalString,
  optionalUuid,
  readJsonObject,
  requiredString,
  requireStaff,
  requireStaffRole,
  slugify,
  supabaseError,
} from "@/app/lib/api/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const includeInactive = new URL(request.url).searchParams.get("includeInactive") === "true";
    const supabase = includeInactive
      ? (await requireStaff(request, "manage_menu")).supabase
      : await getApiSupabase(request);
    const restaurant = await supabase
      .from("restaurants")
      .select("id")
      .eq("slug", RESTAURANT_SLUG)
      .single();
    if (restaurant.error) throw supabaseError(restaurant.error, "Unable to load menu categories.");

    let query = supabase
      .from("menu_categories")
      .select("id,restaurant_id,parent_id,name,slug,sort_order,active")
      .eq("restaurant_id", restaurant.data.id)
      .order("sort_order");
    if (!includeInactive) query = query.eq("active", true);
    const result = await query;
    if (result.error) throw supabaseError(result.error, "Unable to load menu categories.");
    return apiSuccess(result.data ?? []);
  } catch (problem) {
    return handleApiError(problem);
  }
}

export async function POST(request: Request) {
  try {
    assertCsrf(request);
    const { supabase, staff } = await requireStaff(request, "manage_menu");
    requireStaffRole(staff, ["OWNER", "MANAGER"]);
    const body = await readJsonObject(request);
    const name = requiredString(body, "name", { max: 100 });
    const result = await supabase
      .from("menu_categories")
      .insert({
        restaurant_id: staff.restaurantId,
        parent_id: optionalUuid(body, "parentId", true) ?? null,
        name,
        slug: optionalString(body, "slug", { max: 80 }) || slugify(name),
        sort_order: optionalNumber(body, "sortOrder", { integer: true, min: 0 }) ?? 0,
        active: optionalBoolean(body, "active") ?? true,
      })
      .select("id,restaurant_id,parent_id,name,slug,sort_order,active")
      .single();
    if (result.error) throw supabaseError(result.error, "Unable to create the menu category.");
    await auditStaffEvent(staff, "MENU_CATEGORY_CREATED", {}, "menu_category", result.data.id);
    return apiSuccess(result.data, 201);
  } catch (problem) {
    return handleApiError(problem);
  }
}
