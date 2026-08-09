"use client";

import "@/components/dashboard/widgets/manifest";
import { useDashboardWidgetRegistry, getWidgetsForZone, type DashboardWidgetZoneId } from "@/lib/dashboard-widgets";
import { useAuthStore } from "@/lib/auth-store";
import { WidgetGrid } from "@/components/dashboard/widgets/widget-grid";

/**
 * UD-001.1 Phase 4 — Dashboard Layout Engine.
 *
 * Renders every widget registered for `zone`, permission/feature-flag
 * filtered and order-sorted (`getWidgetsForZone`), inside a `WidgetGrid`.
 * `DashboardHome` renders `<DashboardWidgetZone zone="home" />` once and
 * never needs to know which widgets exist — that's the whole point: a
 * future module's widget shows up here the moment it's registered
 * (`widgets/manifest.ts` gains one import line), with zero edits to this
 * component or to `DashboardHome`.
 *
 * The side-effect import of `widgets/manifest` at the top of this file
 * (rather than in `DashboardHome`) means anything that renders a
 * `DashboardWidgetZone` gets the built-in widgets registered for free,
 * without needing to remember that import itself.
 *
 * Renders nothing (not even an empty `WidgetGrid`) when a zone has no
 * registered — or no permission-visible — widgets, the same
 * "don't render empty chrome" convention `Sidebar` already follows for a
 * user with zero visible nav items.
 */
export function DashboardWidgetZone({ zone, columns = 4 }: { zone: DashboardWidgetZoneId; columns?: 3 | 4 }) {
  const widgets = useDashboardWidgetRegistry((s) => s.widgets);
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const items = getWidgetsForZone(widgets, zone, { hasPermission });

  if (items.length === 0) return null;

  return (
    <WidgetGrid columns={columns}>
      {items.map((widget) => {
        const Component = widget.component;
        return <Component key={widget.id} />;
      })}
    </WidgetGrid>
  );
}
