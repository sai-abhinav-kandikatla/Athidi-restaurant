import {
  ApiError,
  RESTAURANT_SLUG,
  apiSuccess,
  getApiSupabase,
  handleApiError,
  requireStaff,
  supabaseError,
} from "@/app/lib/api/server";

export const dynamic = "force-dynamic";

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
      .maybeSingle();
    if (restaurant.error) throw supabaseError(restaurant.error, "Unable to load the menu.");
    if (!restaurant.data) throw new ApiError(404, "not_found", "The restaurant was not found.");

    let categoriesQuery = supabase
      .from("menu_categories")
      .select("id,restaurant_id,parent_id,name,slug,sort_order,active")
      .eq("restaurant_id", restaurant.data.id)
      .order("sort_order");
    let itemsQuery = supabase
      .from("menu_items")
      .select("id,restaurant_id,category_id,name,description,price,is_veg,available,bestseller,image_url,sort_order,category:menu_categories(id,name,slug)")
      .eq("restaurant_id", restaurant.data.id)
      .order("sort_order");
    if (!includeUnavailable) {
      categoriesQuery = categoriesQuery.eq("active", true);
      itemsQuery = itemsQuery.eq("available", true);
    }

    const [categories, items] = await Promise.all([categoriesQuery, itemsQuery]);
    if (categories.error) throw supabaseError(categories.error, "Unable to load menu categories.");
    if (items.error) throw supabaseError(items.error, "Unable to load menu dishes.");

    return apiSuccess({ categories: categories.data ?? [], items: items.data ?? [] });
  } catch (problem) {
    return handleApiError(problem);
  }
}

