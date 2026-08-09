import { Landmark } from "lucide-react";
import { WidgetCard } from "@/features/dashboard/components/widget-card";
import { MarketStatusWidget } from "@/features/market/components/market-status-widget";
import { registerDashboardWidget } from "@/lib/dashboard-widgets";

/**
 * UD-001.1 Phase 4 — self-contained registry entry for the existing
 * `MarketStatusWidget` (unchanged, `features/market/components/`). Before
 * this phase, `DashboardHome` wrapped it in `WidgetCard` itself; that
 * wrapping moves here so the registry's "every widget is one
 * self-sufficient component" rule holds without touching the underlying
 * widget.
 */
export function MarketStatusWidgetCard() {
  return (
    <WidgetCard title="Market Status" icon={<Landmark className="h-4 w-4 text-muted-foreground" aria-hidden="true" />}>
      <MarketStatusWidget />
    </WidgetCard>
  );
}

registerDashboardWidget({
  id: "market-status",
  title: "Market Status",
  zone: "home",
  order: 10,
  component: MarketStatusWidgetCard,
  source: "dashboard",
});
