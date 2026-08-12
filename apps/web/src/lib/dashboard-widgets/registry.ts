"use client";

import { create } from "zustand";
import { isFeatureEnabled } from "@/lib/navigation";
import type { DashboardWidgetDefinition, DashboardWidgetZoneId } from "./types";

/**
 * UD-001.1 Phase 4 — Dashboard Widget Registry.
 *
 * A Zustand store (same state-management convention every other piece of
 * shared UI state in this app already uses — `useAuthStore`,
 * `useThemeStore`, `useWorkspaceStore`, `useCommandPaletteStore`, ...)
 * holding every registered widget, keyed by id. Zustand gives this
 * registry reactivity for free: `DashboardWidgetZone` (the layout engine)
 * subscribes to it, so a widget registered after first render (via the
 * `useRegisterDashboardWidget` hook — see that file) still appears
 * without any extra plumbing.
 *
 * In practice, every widget this phase ships registers *eagerly*, at
 * module scope, before any component renders (see `market-status-
 * widget-card.tsx` etc.) — calling `registerDashboardWidget()` directly
 * is just as valid outside a component as the hook is inside one; Zustand
 * stores are plain objects with a `getState()`/`setState()` outside React.
 */
interface DashboardWidgetRegistryState {
  widgets: Record<string, DashboardWidgetDefinition>;
  registerWidget: (definition: DashboardWidgetDefinition) => void;
  unregisterWidget: (id: string) => void;
}

export const useDashboardWidgetRegistry = create<DashboardWidgetRegistryState>((set) => ({
  widgets: {},
  registerWidget: (definition) => set((s) => ({ widgets: { ...s.widgets, [definition.id]: definition } })),
  unregisterWidget: (id) =>
    set((s) => {
      if (!(id in s.widgets)) return s;
      const next = { ...s.widgets };
      delete next[id];
      return { widgets: next };
    }),
}));

/** Convenience wrapper for eager, module-scope registration — see this
 * file's header comment. Equivalent to
 * `useDashboardWidgetRegistry.getState().registerWidget(definition)`. */
export function registerDashboardWidget(definition: DashboardWidgetDefinition): void {
  useDashboardWidgetRegistry.getState().registerWidget(definition);
}

/**
 * Resolves which widgets should actually render for a zone: correct
 * zone, not `hidden`, permission-gated, feature-flag-gated, sorted by
 * `order` (undefined treated as `100`, matching
 * `DEFAULT_MARKET_DATA_PROVIDERS`'s own "distinct round numbers, gaps
 * left for insertion" convention). Mirrors `getNavigationItems()`'s
 * filtering shape in `lib/navigation/registry.ts` deliberately — same
 * three gates, same order — so the two registries stay predictable
 * relative to each other.
 */
export function getWidgetsForZone(
  widgets: Record<string, DashboardWidgetDefinition>,
  zone: DashboardWidgetZoneId,
  options: { hasPermission: (permission: string) => boolean },
): DashboardWidgetDefinition[] {
  return Object.values(widgets)
    .filter((w) => w.zone === zone)
    .filter((w) => !w.hidden)
    .filter((w) => !w.permission || options.hasPermission(w.permission))
    .filter((w) => !w.featureFlag || isFeatureEnabled(w.featureFlag))
    .sort((a, b) => (a.order ?? 100) - (b.order ?? 100));
}
