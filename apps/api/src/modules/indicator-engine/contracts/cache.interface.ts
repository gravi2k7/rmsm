import type { IndicatorResult } from "./indicator-result.interface";

/**
 * Caching architecture (item 12) — designed, explicitly NOT implemented
 * this phase ("Do not implement caching"). A real implementation lives
 * in `cache/` (currently a deferral-marker-only folder). Two
 * implementations of this same interface are anticipated: an in-memory
 * one (Phase 2+, matching AI-101's own `MarketDataMetricsService`
 * honesty-scoped precedent — real for one instance, not shared across a
 * horizontally-scaled deployment) and a future distributed one (Redis,
 * reusing the platform's existing Redis dependency rather than adding a
 * new one — the same "reuse platform capabilities" rule every module
 * since EP-001 has followed). Both implement this identical interface,
 * so nothing above the cache layer (the computation engine) needs to
 * know or care which one is active.
 */
export interface IndicatorResultCacheKey {
  indicatorIdentifier: string;
  indicatorVersion: string;
  instrumentId: string;
  timeframe: string;
  parameters: Record<string, number | string | boolean>;
}

export interface IndicatorResultCache {
  get(key: IndicatorResultCacheKey): Promise<IndicatorResult | null>;
  set(key: IndicatorResultCacheKey, result: IndicatorResult, ttlSeconds?: number): Promise<void>;
  /** Invalidation on a historical correction (AI-101 ADR-022) or an indicator version bump — the two events that make a cached result no longer trustworthy even though its key still matches. */
  invalidate(key: IndicatorResultCacheKey): Promise<void>;
  /** Bulk invalidation for "this instrument's data changed, drop everything cached for it regardless of which indicator/timeframe/parameters produced it" — the realistic shape a historical correction actually needs (one correction can invalidate many different indicators' cached results for that instrument), not just single-key invalidation. */
  invalidateByInstrument(instrumentId: string): Promise<void>;
}
