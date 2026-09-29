import { DASHBOARD_NAV_SECTION } from "./sections/dashboard.section";
import { AUTOMATION_NAV_SECTION } from "./sections/automation.section";
import { INTEGRATIONS_NAV_SECTION } from "./sections/integrations.section";
import { TRADING_NAV_SECTION } from "./sections/trading.section";
import { OTHER_NAV_SECTION } from "./sections/other.section";
import type { NavigationItem, NavigationSection } from "./types";

export const NAVIGATION_SECTIONS: NavigationSection[] = [
  {
    id: "trading",
    title: "TRADING",
    items: [
      ...DASHBOARD_NAV_SECTION,
      ...TRADING_NAV_SECTION,
    ],
  },
  {
    id: "automation",
    title: "AUTOMATION",
    items: AUTOMATION_NAV_SECTION,
  },
  {
    id: "integrations",
    title: "INTEGRATIONS",
    items: INTEGRATIONS_NAV_SECTION,
  },
  {
    id: "other",
    title: "OTHER",
    items: OTHER_NAV_SECTION,
  },
];

export const NAVIGATION_REGISTRY: NavigationItem[] =
  NAVIGATION_SECTIONS.flatMap((section) => section.items);

const FEATURE_FLAG_OVERRIDES: Record<string, boolean> = {};

export function isFeatureEnabled(flag: string): boolean {
  return FEATURE_FLAG_OVERRIDES[flag] ?? true;
}

export interface GetNavigationItemsOptions {
  hasPermission: (permission: string) => boolean;
}

function filterItems(
  items: NavigationItem[],
  hasPermission: (permission: string) => boolean,
): NavigationItem[] {
  return items
    .filter((item) => !item.hidden)
    .filter((item) => !item.permission || hasPermission(item.permission))
    .filter((item) => !item.featureFlag || isFeatureEnabled(item.featureFlag))
    .map((item) =>
      item.children && item.children.length > 0
        ? { ...item, children: filterItems(item.children, hasPermission) }
        : item,
    );
}

export function getNavigationItems(
  options: GetNavigationItemsOptions,
): NavigationItem[] {
  return NAVIGATION_REGISTRY.length
    ? filterItems(NAVIGATION_REGISTRY, options.hasPermission)
    : [];
}

export function getNavigationSections(
  options: GetNavigationItemsOptions,
): NavigationSection[] {
  return NAVIGATION_SECTIONS
    .map((section) => ({
      ...section,
      items: filterItems(section.items, options.hasPermission),
    }))
    .filter((section) => section.items.length > 0);
}

export function flattenNavigationItems(
  items: NavigationItem[] = NAVIGATION_REGISTRY,
): NavigationItem[] {
  return items.flatMap((item) =>
    item.children && item.children.length > 0
      ? [item, ...flattenNavigationItems(item.children)]
      : [item],
  );
}
