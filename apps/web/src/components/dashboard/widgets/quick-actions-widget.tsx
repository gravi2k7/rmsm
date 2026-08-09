"use client";

import Link from "next/link";
import { Zap } from "lucide-react";
import { Button } from "@rmsm/ui";
import { WidgetCard } from "@/features/dashboard/components/widget-card";
import { getNavigationItems, flattenNavigationItems } from "@/lib/navigation";
import { useAuthStore } from "@/lib/auth-store";
import { registerDashboardWidget } from "@/lib/dashboard-widgets";

/**
 * UD-001.1 Phase 3 — Quick Actions widget.
 *
 * Deliberately built on top of the same Navigation Registry `Sidebar`
 * renders from (`@/lib/navigation`), not a third hardcoded route list —
 * `Sidebar`/`MobileNav` and `CommandPalette`'s `STATIC_COMMANDS` already
 * each keep their own; reusing the registry here means these links stay
 * permission-filtered automatically (an item a viewer's role doesn't have
 * `permission` for here is hidden here exactly like it's hidden in
 * Sidebar, not just visually consistent by coincidence).
 *
 * Curated to a distinct set from the dashboard header's existing shortcut
 * buttons (Market Watch, Strategy Center, Watchlists) rather than
 * repeating them, so the two don't just show the same three links twice.
 */
const QUICK_ACTION_IDS = ["decisions", "orders", "portfolio", "notifications", "settings-team"];

export function QuickActionsWidget() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const items = flattenNavigationItems(getNavigationItems({ hasPermission })).filter((item) => QUICK_ACTION_IDS.includes(item.id));

  return (
    <WidgetCard title="Quick Actions" icon={<Zap className="h-4 w-4 text-muted-foreground" aria-hidden="true" />}>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No actions available for your role.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <Button key={item.id} variant="outline" size="sm" asChild>
                <Link href={item.href}>
                  <Icon className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                  {item.label}
                </Link>
              </Button>
            );
          })}
        </div>
      )}
    </WidgetCard>
  );
}

registerDashboardWidget({
  id: "quick-actions",
  title: "Quick Actions",
  zone: "home",
  order: 40,
  component: QuickActionsWidget,
  source: "dashboard",
});
