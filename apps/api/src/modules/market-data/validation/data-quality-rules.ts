import type { CandleInterval } from "@rmsm/database";
import type { NormalizedCandle } from "../interfaces/normalized-market-data.interface";
import type { InvalidValueDetector, InvalidValueFinding, OutOfOrderDetector, OutOfOrderFinding } from "../contracts/detection.contracts";

/**
 * Findings-based quality checks — return a finding, never throw. This is
 * the deliberate distinction from `candle.validator.ts`/`tick.validator.ts`/
 * `quote.validator.ts` (which reject a single bad record outright): data
 * QUALITY rules are about flagging patterns across a batch for review
 * (feeding a future `DataQualityIssue` row, Phase 1's schema), not
 * rejecting ingestion. "No repair logic. Validation only," per Phase 2C's
 * explicit instruction — nothing here corrects a bad value, only reports
 * it.
 *
 * `RmsmInvalidValueDetector` and `RmsmOutOfOrderDetector` are the first
 * real implementations of Phase 1's `InvalidValueDetector`/
 * `OutOfOrderDetector` contracts (declared as interfaces then, deferred
 * to "a later phase" — this is that phase). `GapDetector` is NOT
 * implemented here — real gap detection needs to know what data
 * SHOULD exist (trading session awareness, Phase 2C's own "no holiday
 * calendar yet" limitation, and ultimately repository access to see
 * what's already persisted), none of which a side-effect-free validator
 * can access; still correctly deferred.
 */

export class RmsmInvalidValueDetector implements InvalidValueDetector {
  detectInvalidValues(candles: NormalizedCandle[]): InvalidValueFinding[] {
    const findings: InvalidValueFinding[] = [];
    for (const candle of candles) {
      const open = Number(candle.open);
      const high = Number(candle.high);
      const low = Number(candle.low);
      const close = Number(candle.close);
      const volume = Number(candle.volume);

      if (open < 0 || high < 0 || low < 0 || close < 0) {
        findings.push({ candle, reason: "negative_price" });
      } else if (open === 0 || high === 0 || low === 0 || close === 0) {
        findings.push({ candle, reason: "zero_price" });
      }
      if (volume < 0) {
        findings.push({ candle, reason: "negative_volume" });
      }
      if (high < low) {
        findings.push({ candle, reason: "high_below_low" });
      }
      if (open > high || open < low || close > high || close < low) {
        findings.push({ candle, reason: "open_close_outside_range" });
      }
    }
    return findings;
  }
}

export class RmsmOutOfOrderDetector implements OutOfOrderDetector {
  detectOutOfOrder(candles: NormalizedCandle[]): OutOfOrderFinding[] {
    const findings: OutOfOrderFinding[] = [];
    for (let i = 1; i < candles.length; i++) {
      const previous = candles[i - 1];
      const current = candles[i];
      if (!previous || !current) continue;
      if (current.eventTime.getTime() < previous.eventTime.getTime()) {
        findings.push({ candle: current, expectedAfter: previous });
      }
    }
    return findings;
  }
}

/** Real gap detection needs repository access this side-effect-free validation layer deliberately doesn't have (Phase 1's GapDetector contract remains unimplemented for that reason, not an oversight). */

// ── The remaining named rules from Phase 2C's list, as small standalone
// finding-functions (not full detector classes, since each operates on a
// single item, not a batch) ──────────────────────────────────────────

export interface QualityFinding {
  rule: string;
  message: string;
}

export function checkMissingFields(candle: Partial<NormalizedCandle>): QualityFinding | null {
  const requiredFields: (keyof NormalizedCandle)[] = ["providerSymbol", "interval", "eventTime", "open", "high", "low", "close", "volume"];
  const missing = requiredFields.filter((f) => candle[f] === undefined || candle[f] === null);
  return missing.length > 0 ? { rule: "missing_fields", message: `Missing required field(s): ${missing.join(", ")}.` } : null;
}

export function checkFutureTimestamp(eventTime: Date, now: Date = new Date()): QualityFinding | null {
  return eventTime.getTime() > now.getTime() ? { rule: "future_timestamp", message: `Event time ${eventTime.toISOString()} is in the future.` } : null;
}

export function checkNegativeTimestamp(eventTime: Date): QualityFinding | null {
  return eventTime.getTime() < 0 ? { rule: "negative_timestamp", message: `Event time ${eventTime.toISOString()} predates the Unix epoch.` } : null;
}

const VALID_INTERVALS = new Set<CandleInterval>([
  "ONE_MINUTE",
  "FIVE_MINUTES",
  "FIFTEEN_MINUTES",
  "THIRTY_MINUTES",
  "ONE_HOUR",
  "FOUR_HOURS",
  "ONE_DAY",
  "ONE_WEEK",
  "ONE_MONTH",
]);

export function checkInvalidTimeframe(interval: string): QualityFinding | null {
  return VALID_INTERVALS.has(interval as CandleInterval) ? null : { rule: "invalid_timeframe", message: `"${interval}" is not a recognized timeframe.` };
}

export function checkInvalidSymbol(symbol: string): QualityFinding | null {
  return symbol.trim().length === 0 ? { rule: "invalid_symbol", message: "Symbol is empty or whitespace-only." } : null;
}

/** "Provider inconsistency" — the same logical instrument reported with materially different reference data (name, currency) by different candles/quotes claiming the same providerSymbol within one batch. A real, if narrow, check: catches a provider silently changing what a symbol means mid-batch, not a general reconciliation across providers (which needs InstrumentAlias resolution, out of scope here). */
export function checkProviderInconsistency(items: { providerSymbol: string; currency?: string }[]): QualityFinding[] {
  const findings: QualityFinding[] = [];
  const seenCurrency = new Map<string, string>();
  for (const item of items) {
    if (!item.currency) continue;
    const previous = seenCurrency.get(item.providerSymbol);
    if (previous && previous !== item.currency) {
      findings.push({
        rule: "provider_inconsistency",
        message: `Symbol "${item.providerSymbol}" reported with inconsistent currency ("${previous}" vs "${item.currency}") within the same batch.`,
      });
    } else {
      seenCurrency.set(item.providerSymbol, item.currency);
    }
  }
  return findings;
}
