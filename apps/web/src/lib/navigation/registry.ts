import { DASHBOARD_NAV_SECTION } from "./sections/dashboard.section";
import { TRADING_NAV_SECTION } from "./sections/trading.section";
import { ANALYTICS_NAV_SECTION } from "./sections/analytics.section";
import { NOTIFICATIONS_NAV_SECTION } from "./sections/notifications.section";
import { ORGANIZATION_NAV_SECTION } from "./sections/organization.section";
import { SETTINGS_NAV_SECTION } from "./sections/settings.section";
import type { NavigationItem } from "./types";

/**
 * The full navigation registry: every section, concatenated in the exact
 * order the original flat `NAV_ITEMS` array declared them in (Dashboard,
 * Market Watch, Watchlists, Strategies, Opportunities, Decisions, Orders,
 * Portfolio, Analytics, Notifications, Team, Security) — so the rendered
 * Sidebar/MobileNav order is byte-for-byte unchanged by this refactor.
 *
 * Adding a future module's items (Organization beyond Team, Billing,
 * Licensing, Market Data, Broker, AI, Reports, ...) means adding one new
 * `sections/<domain>.section.ts` file and one line here — never editing
 * an existing section, and never growing a single monolithic file.
 */
export const NAVIGATION_REGISTRY: NavigationItem[] = [
  ...DASHBOARD_NAV_SECTION,
  ...TRADING_NAV_SECTION,
  ...ANALYTICS_NAV_SECTION,
  ...NOTIFICATIONS_NAV_SECTION,
  ...ORGANIZATION_NAV_SECTION,
  ...SETTINGS_NAV_SECTION,
];

/**
 * Evaluates a `NavigationItem.featureFlag` name. No feature-flag service
 * exists in this codebase yet (confirmed — nothing in `apps/web/src`
 * references one). Deliberately NOT implemented via dynamic
 * `process.env[key]` lookups: this runs in Sidebar/MobileNav, both client
 * components, and Next.js only inlines `NEXT_PUBLIC_*` env vars into the
 * client bundle when they're referenced as a static, literal
 * `process.env.NEXT_PUBLIC_X` expression — a dynamic bracket lookup like
 * `process.env[computedKey]` is invisible to that build-time replacement
 * and would silently always read `undefined` in the browser, i.e. it
 * would look like a real implementation while never actually working.
 *
 * Instead this is a plain, explicit override map — no flags defined
 * today (every existing item has no `featureFlag`, so this is not on any
 * current route's critical path), populated by name as real flags are
 * introduced. This is honest about being a minimal starting point without
 * being non-functional: a flag added here today would actually gate
 * visibility, on both server and client renders, with no env-inlining
 * trap. Swapping this for a real flag service later only changes this
 * one function's body — `NavigationItem.featureFlag` and every caller of
 * `getNavigationItems()` stay the same.
 */
const FEATURE_FLAG_OVERRIDES: Record<string, boolean> = {};

export function isFeatureEnabled(flag: string): boolean {
  return FEATURE_FLAG_OVERRIDES[flag] ?? true;
}

export interface GetNavigationItemsOptions {
  /** Same permission predicate `useAuthStore().hasPermission` already
   * exposes — passed in rather than read from the store directly so this
   * function stays a pure, testable filter. */
  hasPermission: (permission: string) => boolean;
}

/**
 * Filters (and recursively filters the `children` of) the registry down
 * to what should actually render in the Sidebar/MobileNav for the current
 * user: permission-gated, feature-flag-gated, and `hidden`-excluded.
 * Centralizing this here means Sidebar and MobileNav can no longer drift
 * out of sync with each other the way two independent inline `.filter()`
 * calls could.
 */
export function getNavigationItems(options: GetNavigationItemsOptions): NavigationItem[] {
  const { hasPermission } = options;

  function filterItems(items: NavigationItem[]): NavigationItem[] {
    return items
      .filter((item) => !item.hidden)
      .filter((item) => !item.permission || hasPermission(item.permission))
      .filter((item) => !item.featureFlag || isFeatureEnabled(item.featureFlag))
      .map((item) => (item.children && item.children.length > 0 ? { ...item, children: filterItems(item.children) } : item));
  }

  return filterItems(NAVIGATION_REGISTRY);
}

/** Flattens the full registry (including `children`, ignoring `hidden`)
 * into a single list — used by `Breadcrumbs` to resolve a path segment's
 * label regardless of nesting depth or visibility filtering. */
export function flattenNavigationItems(items: NavigationItem[] = NAVIGATION_REGISTRY): NavigationItem[] {
  return items.flatMap((item) => (item.children && item.children.length > 0 ? [item, ...flattenNavigationItems(item.children)] : [item]));
}
