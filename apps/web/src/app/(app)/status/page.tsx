import { DashboardHome } from "@/components/dashboard/dashboard-home";

export default function StatusPage() {
  return (
    <DashboardHome
      excludeWidgetIds={["system-status", "recent-activity"]}
    />
  );
}
