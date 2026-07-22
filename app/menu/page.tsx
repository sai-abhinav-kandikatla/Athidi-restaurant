import type { Metadata } from "next";
import { OrderApp } from "../components/order-app";

export const metadata: Metadata = { title: "Menu", description: "Explore the Athidhi menu and build your order." };
export default function MenuPage() { return <OrderApp />; }
