import type { MenuCategory, MenuItem } from "../restaurant-types";
import { normalizeCategories, normalizeMenuItem } from "../menu";
import { getServerSupabase } from "./server";

export type PublicRestaurantData = {
  restaurant: {
    id: string;
    name: string;
    slug: string;
    phone: string | null;
    whatsapp: string | null;
  } | null;
  branch: {
    id: string;
    name: string;
    address: string | null;
    opens_at: string | null;
    closes_at: string | null;
  } | null;
  categories: MenuCategory[];
  items: MenuItem[];
  configured: boolean;
};

export async function getPublicRestaurantData(): Promise<PublicRestaurantData> {
  const supabase = await getServerSupabase();
  if (!supabase) {
    return {
      restaurant: null,
      branch: null,
      categories: [],
      items: [],
      configured: false,
    };
  }

  const [restaurantResult, categoryResult, itemResult] = await Promise.all([
    supabase
      .from("restaurants")
      .select("id,name,slug,phone,whatsapp,branches(id,name,address,opens_at,closes_at)")
      .eq("slug", "athidhi-family-restaurant")
      .maybeSingle(),
    supabase
      .from("menu_categories")
      .select("id,restaurant_id,name,slug,sort_order,active")
      .eq("active", true)
      .order("sort_order"),
    supabase
      .from("menu_items")
      .select(
        "id,restaurant_id,category_id,name,description,price,is_veg,available,bestseller,image_url,sort_order,category:menu_categories(id,name,slug)",
      )
      .eq("available", true)
      .order("sort_order"),
  ]);

  if (restaurantResult.error || categoryResult.error || itemResult.error) {
    console.error("Unable to load public restaurant data", {
      restaurant: restaurantResult.error?.code ?? null,
      categories: categoryResult.error?.code ?? null,
      menu: itemResult.error?.code ?? null,
    });
  }

  const rawRestaurant = restaurantResult.data as
    | {
        id: string;
        name: string;
        slug: string;
        phone: string | null;
        whatsapp: string | null;
        branches:
          | {
              id: string;
              name: string;
              address: string | null;
              opens_at: string | null;
              closes_at: string | null;
            }[]
          | null;
      }
    | null;

  return {
    restaurant: rawRestaurant
      ? {
          id: rawRestaurant.id,
          name: rawRestaurant.name,
          slug: rawRestaurant.slug,
          phone: rawRestaurant.phone,
          whatsapp: rawRestaurant.whatsapp,
        }
      : null,
    branch: rawRestaurant?.branches?.[0] ?? null,
    categories: normalizeCategories((categoryResult.data ?? []) as MenuCategory[]),
    items: ((itemResult.data ?? []) as unknown as MenuItem[]).map(normalizeMenuItem),
    configured: true,
  };
}
