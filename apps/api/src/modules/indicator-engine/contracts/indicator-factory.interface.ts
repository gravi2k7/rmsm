import type { Indicator } from "./indicator.interface";

/**
 * Constructs an `Indicator` instance for a given identifier + parameter
 * set. Same registry+factory split this project has now used 4 times
 * (EP-002 OAuth, EP-004 payments, EP-005 notification providers,
 * AI-101 market-data providers) — `IndicatorFactory` is the
 * construction side, `IndicatorRegistry` (below) is the
 * lookup/discovery side. No switch statement on `identifier` anywhere
 * in a real implementation of this interface, per the same
 * "provider selection must happen here, no switch statements
 * throughout the application" discipline AI-101 Phase 2B established
 * for its own Factory — a Map-based builder-registration dispatch is
 * the expected Phase 2 implementation shape, not decided here since
 * this phase is contracts only.
 */
export interface IndicatorFactory {
  registerBuilder(identifier: string, build: (parameters: Record<string, number | string | boolean>) => Indicator): void;
  create(identifier: string, parameters: Record<string, number | string | boolean>): Indicator;
}
