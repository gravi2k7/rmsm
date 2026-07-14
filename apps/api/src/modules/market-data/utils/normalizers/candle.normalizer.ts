import type { CandleInterval } from "@rmsm/database";
import type { NormalizedCandle } from "../../interfaces/normalized-market-data.interface";
import { normalizeDecimal } from "./decimal.normalizer";
import { normalizeTimestamp } from "./time.normalizer";
import { normalizeSymbol } from "./symbol.normalizer";
import { requireField } from "./mapping.utils";

/** A permissive raw shape covering what any real provider's candle payload plausibly carries — providers vary field names/types (string vs number prices, epoch vs ISO timestamps), which is exactly what this normalizer exists to absorb. */
export interface RawCandlePayload {
  symbol: string;
  interval: CandleInterval;
  time: string | number;
  open: string | number;
  high: string | number;
  low: string | number;
  close: string | number;
  volume: string | number;
  sourceTimestamp?: string | number;
}

const PRICE_SCALE = 10;
const VOLUME_SCALE = 10;

/**
 * Format canonicalization only — decimal precision, UTC timestamp,
 * symbol casing. Does NOT check OHLC relationships or reject negative
 * volume; that's `validation/candle.validator.ts`'s job, applied to this
 * normalizer's output as a distinct, later pass (Phase 2C's own
 * "Normalizers" vs. "Validation" separation, items 1 and 2).
 * Deterministic and side-effect-free: no database access, no network
 * access, same input always produces the same output.
 */
export function normalizeCandle(raw: RawCandlePayload): NormalizedCandle {
  const { symbol } = normalizeSymbol(requireField(raw.symbol, "symbol", raw));

  return {
    providerSymbol: symbol,
    interval: requireField(raw.interval, "interval", raw),
    eventTime: normalizeTimestamp(requireField(raw.time, "time", raw)),
    open: normalizeDecimal(requireField(raw.open, "open", raw), { maxScale: PRICE_SCALE }),
    high: normalizeDecimal(requireField(raw.high, "high", raw), { maxScale: PRICE_SCALE }),
    low: normalizeDecimal(requireField(raw.low, "low", raw), { maxScale: PRICE_SCALE }),
    close: normalizeDecimal(requireField(raw.close, "close", raw), { maxScale: PRICE_SCALE }),
    volume: normalizeDecimal(requireField(raw.volume, "volume", raw), { maxScale: VOLUME_SCALE }),
    sourceTimestamp: raw.sourceTimestamp !== undefined ? normalizeTimestamp(raw.sourceTimestamp) : undefined,
  };
}
