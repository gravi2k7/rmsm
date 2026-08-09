import type { LucideIcon } from "lucide-react";

/**
 * A single entry in the dashboard navigation registry.
 *
 * This is the enterprise-extended successor to the old flat `NavItem`
 * (see `lib/nav-items.tsx`, kept as a deprecated re-export for backward
 * compatibility). Every field below except `children` existed implicitly
 * before this registry; `children` is genuinely new.
 */
export interface NavigationItem {
  /** Stable identifier, independent of `label`/`href` — used as the React
   * key and as the anchor for future deep-linking (e.g. highlighting a
   * specific item from a saved view) without depending on route shape. */
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  /** The permission that gates *seeing* this item — a UX convenience,
   * not a security boundary; every page it points to still checks its
   * own data access server-side regardless of what the sidebar shows. */
  permission?: string;
  /** Nested items, rendered as a collapsible sub-menu. Optional and
   * empty today for every existing item — adding it is purely additive
   * (see `sidebar.tsx`/`mobile-nav.tsx`'s recursive renderer). */
  children?: NavigationItem[];
  /** Short label rendered as a pill next to the item (e.g. unread count,
   * "New", "Beta"). Static string today; a future phase can wire this to
   * live data (e.g. notification unread count) without changing the type. */
  badge?: string;
  /** Name of a feature flag gating this item's visibility, evaluated via
   * `isFeatureEnabled()` (see `registry.ts`). Undefined means "always
   * visible" (current behavior for every existing item, unchanged). */
  featureFlag?: string;
  /** Unconditionally hides the item from rendered nav (but not from the
   * registry itself) — for entries kept registered for breadcrumb/search
   * resolution but not meant to appear in the Sidebar/MobileNav list. */
  hidden?: boolean;
  /** Marks the item as pointing outside the app shell — renders with a
   * plain `<a target="_blank" rel="noopener noreferrer">` instead of
   * Next's `<Link>`, plus an external-link affordance. */
  external?: boolean;
}

/** @deprecated Use `NavigationItem`. Kept only so `lib/nav-items.tsx`'s
 * re-exported `NavItem` alias still type-checks for any external import. */
export type NavItem = NavigationItem;
