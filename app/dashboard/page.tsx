import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isUnlocked } from "@/lib/session/unlock";
import { DashboardClient } from "@/components/dashboard/DashboardClient";

export const metadata: Metadata = {
  title: "Dashboard — Hybrid Matrix",
  description: "รันการวิเคราะห์ชุดตัวเลขด้วย Hybrid Matrix Algorithm",
};

export default function DashboardPage() {
  if (!isUnlocked()) redirect("/");
  return <DashboardClient />;
}
