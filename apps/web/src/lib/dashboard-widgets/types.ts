import type { ComponentType } from "react";

/**
 * Known dashboard widget zones. Typed as a union of the one zone that
 * exists today (the Dashboard Home widget row) rather than a bare
 * `string`, so a typo in a future module's registration fails at compile
 * time — extend this union (not a second parallel type) when a real
 * second zone is needed (e.g. a future per-module dashboard).
 */
export type DashboardWidgetZoneId = "home";

/**
 * Metadata for one pluggable dashboard widget.
 *
 * A "widget" in this registry is always a fully self-contained React
 * component: it renders its own card chrome (via `WidgetCard`, same as
 * every widget already did before this registry existed), fetches its
 * own data, and applies its own responsive grid-span className to its
 * own root element. The registry does not re-wrap or re-style
 * `component` — `span` below is descriptive metadata for introspection
 * (e.g. a future "manage widgets" settings screen), not something the
 * layout engine uses to compute layout; the component's own className
 * is what actually controls its grid span, exactly as
 * `RecentActivityWidget` already did in Phase 3.
 */
export interface DashboardWidgetDefinition {
  /** Stable, unique id — also the React key the layout engine renders
   * with, and the id a second `registerDashboardWidget` call with the
   * same id would replace (last write wins), the same semantics
   * `NavigationItem.id` already has. */
  id: string;
  title: string;
  description?: string;
  zone: DashboardWidgetZoneId;
  /** Fully self-contained — see this interface's own header comment. */
  component: ComponentType;
  /** Sort order within its zone, ascending, lower first. Matches
   * `DefaultMarketDataProviderConfig.priority`'s own convention
   * (distinct round-number values, not a tight sequence) so future
   * widgets can be inserted between existing ones without renumbering. */
  order?: number;
  /** Informational only — see this interface's header comment. */
  span?: 1 | 2 | 3 | 4;
  /** Same UX-convenience-not-security-boundary semantics as
   * `NavigationItem.permission`. */
  permission?: string;
  /** Evaluated via `@/lib/navigation`'s `isFeatureEnabled` — the same
   * flag namespace Sidebar/MobileNav items already use, so a widget and
   * its corresponding nav entry can share one flag name. */
  featureFlag?: string;
  hidden?: boolean;
  /** Which module registered this widget (e.g. `"dashboard"`,
   * `"billing"`) — not used for filtering, purely for introspection/
   * debugging when multiple modules' widgets are registered together. */
  source: string;
}
