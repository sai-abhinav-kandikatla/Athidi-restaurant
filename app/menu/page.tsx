import type { Metadata } from "next";
import { OrderApp } from "../components/order-app";
import { getPublicRestaurantData } from "../lib/supabase/public-data";

export const metadata: Metadata = {
  title: "Menu",
  description: "Explore the live Athidhi menu and current availability.",
};
export const dynamic = "force-dynamic";

export default async function MenuPage() {
  const data = await getPublicRestaurantData();
  return (
    <OrderApp
      initialCategories={data.categories}
      initialItems={data.items}
      configured={data.configured}
    />
  );
}
