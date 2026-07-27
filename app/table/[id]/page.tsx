import type { Metadata } from "next";
import { OrderApp } from "../../components/order-app";
import { getPublicRestaurantData } from "../../lib/supabase/public-data";

export const metadata: Metadata = {
  title: "Table ordering",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
  description: "Order from your table at Athidi—no sign-up required.",
};

export const dynamic = "force-dynamic";

export default async function TablePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getPublicRestaurantData();

  return (
    <OrderApp
      tableToken={id}
      initialCategories={data.categories}
      initialItems={data.items}
      configured={data.configured}
    />
  );
}
