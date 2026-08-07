"use client";

import { useEffect } from "react";
import { useDashboardWidgetRegistry } from "./registry";
import type { DashboardWidgetDefinition } from "./types";

/**
 * UD-001.1 Phase 4 — Widget Provider Pattern, dynamic variant.
 *
 * The registry (`registry.ts`) supports two ways for a module to
 * "provide" a widget:
 *
 *  1. **Eager, module-scope** (what every built-in widget in this phase
 *     uses — see `market-status-widget-card.tsx` etc.): call
 *     `registerDashboardWidget(definition)` directly at the top level of
 *     the widget's own file. Runs once, the moment that file is first
 *     imported (by `components/dashboard/widgets/manifest.ts`), before
 *     `DashboardHome` ever renders — no flash, no effect timing to
 *     reason about. Right for anything that's always available.
 *
 *  2. **Component-scoped** (this hook): call
 *     `useRegisterDashboardWidget(definition)` from inside a component
 *     that's already guaranteed to mount somewhere in the tree. Useful
 *     when a widget's *existence* (not just its visibility — `hidden`/
 *     `permission`/`featureFlag` already handle conditional visibility
 *     for the eager path) depends on something only known at runtime
 *     inside a component, e.g. a value read from a context that isn't
 *     available at module-eval time. Registers on mount, unregisters on
 *     unmount, so the widget correctly disappears if its owning
 *     component ever unmounts.
 *
 * `definition` must be a *stable* reference (defined at module scope, or
 * memoized) — passing a fresh object literal every render would
 * re-register on every render, which the effect's dependency array
 * would faithfully do, but is never the intent.
 */
export function useRegisterDashboardWidget(definition: DashboardWidgetDefinition): void {
  const registerWidget = useDashboardWidgetRegistry((s) => s.registerWidget);
  const unregisterWidget = useDashboardWidgetRegistry((s) => s.unregisterWidget);

  useEffect(() => {
    registerWidget(definition);
    return () => unregisterWidget(definition.id);
  }, [definition, registerWidget, unregisterWidget]);
}
