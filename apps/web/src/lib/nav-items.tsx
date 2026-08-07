/**
 * @deprecated This flat list has been superseded by the Navigation
 * Registry (`lib/navigation/`) — see `lib/navigation/registry.ts` for the
 * live source of truth, split into one file per domain instead of one
 * growing array. This module is kept only as a backward-compatible
 * re-export so any import of `NAV_ITEMS`/`NavItem` from this exact path
 * keeps working unchanged. New code should import from `@/lib/navigation`
 * directly.
 */
export type { NavItem } from "./navigation/types";
export { NAVIGATION_REGISTRY as NAV_ITEMS } from "./navigation/registry";
