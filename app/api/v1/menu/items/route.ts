import { assertCsrf, auditStaffEvent } from "@/app/lib/api/security";
import {
  ApiError,
  RESTAURANT_SLUG,
  apiSuccess,
  getApiSupabase,
  handleApiError,
  listOptions,
  optionalBoolean,
  optionalNumber,
  optionalString,
  readJsonObject,
  requiredNumber,
  requiredString,
  requiredUuid,
  requireStaff,
  requireStaffRole,
  supabaseError,
} from "@/app/lib/api/server";

export const dynamic = "force-dynamic";

const select =
  "id,restaurant_id,category_id,name,description,price,is_veg,available,bestseller,image_url,sort_order,category:menu_categories(id,name,slug)";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const includeUnavailable = url.searchParams.get("includeUnavailable") === "true";
    const supabase = includeUnavailable
      ? (await requireStaff(request, "manage_menu")).supabase
      : await getApiSupabase(request);
    const restaurant = await supabase
      .from("restaurants")
      .select("id")
      .eq("slug", RESTAURANT_SLUG)
      .single();
    if (restaurant.error) throw supabaseError(restaurant.error, "Unable to load menu dishes.");
    const { limit, offset } = listOptions(request, 250);
    let query = supabase
      .from("menu_items")
      .select(select)
      .eq("restaurant_id", restaurant.data.id)
      .order("sort_order")
      .range(offset, offset + limit - 1);
    if (!includeUnavailable) query = query.eq("available", true);
    const categoryId = url.searchParams.get("categoryId");
    if (categoryId) query = query.eq("category_id", categoryId);
    const result = await query;
    if (result.error) throw supabaseError(result.error, "Unable to load menu dishes.");
    return apiSuccess(result.data ?? [], 200, { limit, offset });
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
    const isVeg = optionalBoolean(body, "isVeg");
    if (isVeg === undefined) {
      throw new ApiError(422, "validation_error", "isVeg is required.");
    }
    const result = await supabase
      .from("menu_items")
      .insert({
        restaurant_id: staff.restaurantId,
        category_id: requiredUuid(body, "categoryId"),
        name: requiredString(body, "name", { max: 120 }),
        description: optionalString(body, "description", { max: 500, nullable: true }) ?? null,
        price: requiredNumber(body, "price", { min: 0, max: 1_000_000 }),
        is_veg: isVeg,
        available: optionalBoolean(body, "available") ?? true,
        bestseller: optionalBoolean(body, "bestseller") ?? false,
        image_url: optionalString(body, "imageUrl", { max: 1000, nullable: true }) ?? null,
        sort_order: optionalNumber(body, "sortOrder", { integer: true, min: 0 }) ?? 0,
      })
      .select(select)
      .single();
    if (result.error) throw supabaseError(result.error, "Unable to create the menu dish.");
    await auditStaffEvent(staff, "MENU_ITEM_CREATED", {}, "menu_item", result.data.id);
    return apiSuccess(result.data, 201);
  } catch (problem) {
    return handleApiError(problem);
  }
}
