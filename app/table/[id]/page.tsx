import type { Metadata } from "next";
import { OrderApp } from "../../components/order-app";

export const metadata: Metadata = { title: "Table ordering", description: "Order from your table at Athidhi—no sign-up required." };
export default async function TablePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <OrderApp tableNumber={id} />;
}
