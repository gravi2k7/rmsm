/**
 * UD-001.1 Phase 4 — built-in dashboard widget manifest.
 *
 * Side-effect-only imports: each of these files calls
 * `registerDashboardWidget(...)` at module scope the instant it's
 * imported (see `lib/dashboard-widgets/registry.ts`'s header comment for
 * why that's the intended, SSR-safe pattern). This file's only job is to
 * guarantee all of them are imported — and therefore registered — before
 * `DashboardHome` renders.
 *
 * This file, not `DashboardHome`, is the single integration point the
 * UD-001.1 spec's "every future module must be able to register
 * dashboard widgets without modifying DashboardHome" requirement refers
 * to. Adding a Dashboard Home widget for a future module (Billing,
 * Broker, Licensing, AI, Market Data, Reports — none of which exist yet,
 * per this phase's explicit "infrastructure only" scope) means: that
 * module writes its own self-registering widget file (same shape as
 * `quick-actions-widget.tsx` — a component plus one
 * `registerDashboardWidget()` call), then this file gains exactly one new
 * import line. `DashboardHome` itself is never touched again.
 *
 * Illustrative only (Billing is not implemented):
 * ```ts
 * import "@/features/billing/components/billing-summary-widget";
 * ```
 */
import "./market-status-widget-card";
import "./trading-sessions-widget-card";
import "./system-status-widget";
import "./quick-actions-widget";
import "./recent-activity-widget";
