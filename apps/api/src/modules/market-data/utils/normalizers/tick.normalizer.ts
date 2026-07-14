import type { NormalizedTick } from "../../interfaces/normalized-market-data.interface";
import { normalizeDecimal } from "./decimal.normalizer";
import { normalizeTimestamp } from "./time.normalizer";
import { normalizeSymbol } from "./symbol.normalizer";
import { requireField } from "./mapping.utils";

export interface RawTickPayload {
  symbol: string;
  price: string | number;
  size: string | number;
  time: string | number;
  sourceTimestamp?: string | number;
}

const PRICE_SCALE = 10;
const SIZE_SCALE = 10;

/** Format canonicalization only — see candle.normalizer.ts's class comment. */
export function normalizeTick(raw: RawTickPayload): NormalizedTick {
  const { symbol } = normalizeSymbol(requireField(raw.symbol, "symbol", raw));

  return {
    providerSymbol: symbol,
    price: normalizeDecimal(requireField(raw.price, "price", raw), { maxScale: PRICE_SCALE }),
    size: normalizeDecimal(requireField(raw.size, "size", raw), { maxScale: SIZE_SCALE }),
    eventTime: normalizeTimestamp(requireField(raw.time, "time", raw)),
    sourceTimestamp: raw.sourceTimestamp !== undefined ? normalizeTimestamp(raw.sourceTimestamp) : undefined,
  };
}
