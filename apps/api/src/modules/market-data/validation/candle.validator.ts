import type { NormalizedCandle } from "../interfaces/normalized-market-data.interface";
import { InvalidOhlcError, InvalidVolumeError, InvalidTimestampError } from "./errors/market-data-validation.error";

const VALID_INTERVALS = new Set([
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

/**
 * Business-rule correctness checks on an ALREADY-NORMALIZED candle
 * (`candle.normalizer.ts`'s output) — the distinct second pass, per
 * Phase 2C's own "Normalizers" (item 1) vs. "Validation" (item 2, with
 * "Candle Validation" as item 6's own explicit rule list, applied here
 * literally). Compares decimal strings via `Number()` for ordering only
 * — safe here because these values already passed
 * `normalizeDecimal()`'s precision/format checks; this function never
 * uses the parsed number for anything that would be stored or need exact
 * precision, only for `>=`/`<=` comparisons where float epsilon error at
 * this scale cannot flip a true relational comparison's answer.
 */
export function validateCandle(candle: NormalizedCandle): void {
  const open = Number(candle.open);
  const high = Number(candle.high);
  const low = Number(candle.low);
  const close = Number(candle.close);
  const volume = Number(candle.volume);

  if (!(high >= open)) {
    throw new InvalidOhlcError(`High (${candle.high}) must be >= Open (${candle.open}).`, { candle });
  }
  if (!(high >= close)) {
    throw new InvalidOhlcError(`High (${candle.high}) must be >= Close (${candle.close}).`, { candle });
  }
  if (!(low <= open)) {
    throw new InvalidOhlcError(`Low (${candle.low}) must be <= Open (${candle.open}).`, { candle });
  }
  if (!(low <= close)) {
    throw new InvalidOhlcError(`Low (${candle.low}) must be <= Close (${candle.close}).`, { candle });
  }
  if (!(high >= low)) {
    throw new InvalidOhlcError(`High (${candle.high}) must be >= Low (${candle.low}).`, { candle });
  }

  if (volume < 0) {
    throw new InvalidVolumeError(`Volume (${candle.volume}) cannot be negative.`, { candle });
  }

  if (!VALID_INTERVALS.has(candle.interval)) {
    throw new InvalidTimestampError(`"${candle.interval}" is not a recognized candle interval.`, { candle });
  }

  if (!(candle.eventTime instanceof Date) || Number.isNaN(candle.eventTime.getTime())) {
    throw new InvalidTimestampError("eventTime is not a valid Date.", { candle });
  }
}
