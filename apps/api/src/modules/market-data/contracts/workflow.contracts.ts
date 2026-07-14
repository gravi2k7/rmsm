import type { DataGap } from "@rmsm/database";

/**
 * Workflow-oriented data quality contracts — timezone/session validation,
 * provider outage classification, the backfill workflow, and the manual
 * correction workflow. See detection.contracts.ts's own comment for why
 * these are split into a separate file.
 */

export interface SessionValidationResult {
  isWithinTradingSession: boolean;
  /** Populated when isWithinTradingSession is false — which session type (if any) the event time falls closest to, useful for a future UI's "this trade occurred after-hours" labeling. */
  nearestSessionType?: string;
}

/** Validates an event time against an exchange's actual trading calendar (TradingSession rows) — not just "is this a weekday," which the prompt's explicit "never use local server time as market time" standard exists specifically to prevent getting wrong. */
export interface SessionValidator {
  validate(exchangeId: string, eventTimeUtc: Date): Promise<SessionValidationResult>;
}

export type ProviderOutageClassification = "healthy" | "degraded" | "down" | "unknown";

/** Distinct from ProviderErrorMapper (interfaces/provider-error-mapper.interface.ts), which classifies ONE error from ONE call. This classifies a PROVIDER's overall health from a pattern of recent calls/errors — the input a future alerting service (via EP-005 notifications, per this module's Enterprise Platform Integration section) would act on. */
export interface ProviderOutageClassifier {
  classify(providerId: string, recentErrorRate: number, recentLatencyMs: number): ProviderOutageClassification;
}

export interface BackfillRequest {
  instrumentId: string;
  gapId: string;
}

export interface BackfillResult {
  gap: DataGap;
  candlesBackfilled: number;
  succeeded: boolean;
  failureReason?: string;
}

/** Orchestrates re-fetching data for a known DataGap — the workflow this contract describes: find the gap, request the missing range from the provider that originally supplied this instrument's data, write the result, mark the gap resolved (or leave it UNRESOLVED with a reason). Implementation is Phase 2+; this is the shape callers (a future synchronization worker) will depend on. */
export interface BackfillWorkflow {
  execute(request: BackfillRequest): Promise<BackfillResult>;
}

export interface ManualCorrectionRequest {
  candleId: string;
  correctedOpen?: string;
  correctedHigh?: string;
  correctedLow?: string;
  correctedClose?: string;
  correctedVolume?: string;
  reason: string;
  actorId: string;
}

/** Produces a NEW MarketCandle row (isCorrection: true, supersedesId set) rather than mutating the original — enforcing the schema's "never silently overwrite historical corrections" design decision (schema.prisma's Phase 1 comment) at the contract level, not just documented intent a future implementation could accidentally violate. */
export interface ManualCorrectionWorkflow {
  execute(request: ManualCorrectionRequest): Promise<{ correctedCandleId: string }>;
}
