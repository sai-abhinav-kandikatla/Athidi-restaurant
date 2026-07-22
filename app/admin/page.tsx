import type { Metadata } from "next";
import { AdminOS } from "../components/admin-os";

export const metadata: Metadata = { title: "Restaurant operations", description: "Athidhi restaurant operations dashboard." };
export default function AdminPage() { return <AdminOS />; }
