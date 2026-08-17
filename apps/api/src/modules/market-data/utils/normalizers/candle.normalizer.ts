import type { CandleInterval } from "@rmsm/database";
import type { NormalizedCandle } from "../../interfaces/normalized-market-data.interface";
import { normalizeDecimal, normalizePriceDecimal } from "./decimal.normalizer";
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

const DEFAULT_PRICE_SCALE = 10;
const VOLUME_SCALE = 10;

const PRICE_SCALE_BY_SYMBOL: Record<string, number> = {
  "EUR/USD": 5,
  "GBP/USD": 5,
  "AUD/USD": 5,
  "USD/JPY": 2,
  "XAU/USD": 2,
};

function priceScaleForSymbol(symbol: string): number {
  return PRICE_SCALE_BY_SYMBOL[symbol] ?? DEFAULT_PRICE_SCALE;
}

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

  const priceScale = priceScaleForSymbol(symbol);

  return {
    providerSymbol: symbol,
    interval: requireField(raw.interval, "interval", raw),
    eventTime: normalizeTimestamp(requireField(raw.time, "time", raw)),
    open: normalizePriceDecimal(requireField(raw.open, "open", raw), priceScale),
    high: normalizePriceDecimal(requireField(raw.high, "high", raw), priceScale),
    low: normalizePriceDecimal(requireField(raw.low, "low", raw), priceScale),
    close: normalizePriceDecimal(requireField(raw.close, "close", raw), priceScale),
    volume: normalizeDecimal(requireField(raw.volume, "volume", raw), { maxScale: VOLUME_SCALE }),
    sourceTimestamp: raw.sourceTimestamp !== undefined ? normalizeTimestamp(raw.sourceTimestamp) : undefined,
  };
}
