import { Activity } from "lucide-react";
import { WidgetCard } from "@/features/dashboard/components/widget-card";
import { TradingSessionsWidget } from "@/features/market/components/trading-sessions-widget";
import { registerDashboardWidget } from "@/lib/dashboard-widgets";

/** See `market-status-widget-card.tsx`'s header comment — same pattern. */
export function TradingSessionsWidgetCard() {
  return (
    <WidgetCard title="Trading Sessions" icon={<Activity className="h-4 w-4 text-muted-foreground" aria-hidden="true" />}>
      <TradingSessionsWidget />
    </WidgetCard>
  );
}

registerDashboardWidget({
  id: "trading-sessions",
  title: "Trading Sessions",
  zone: "home",
  order: 20,
  component: TradingSessionsWidgetCard,
  source: "dashboard",
});
