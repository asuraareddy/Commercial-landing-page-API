import { Metadata } from "next";
import { AdminDashboard } from "@/components/AdminDashboard";

export const metadata: Metadata = {
  title: "Admin Dashboard - WhatsApp Bridge Manager",
  description: "Manage logos, WhatsApp numbers, pre-filled messages, and meta tags for your landing pages.",
};

export default function AdminPage() {
  return <AdminDashboard />;
}
