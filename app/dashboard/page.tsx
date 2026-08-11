import { redirect } from "next/navigation";
import { isUnlocked } from "@/lib/session/unlock";
import { DashboardClient } from "@/components/dashboard/DashboardClient";

export default function DashboardPage() {
  if (!isUnlocked()) redirect("/");
  return <DashboardClient />;
}
