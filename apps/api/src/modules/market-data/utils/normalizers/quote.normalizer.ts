import type { NormalizedQuote } from "../../interfaces/normalized-market-data.interface";
import { normalizeDecimal } from "./decimal.normalizer";
import { normalizeTimestamp } from "./time.normalizer";
import { normalizeSymbol } from "./symbol.normalizer";
import { requireField, optionalField } from "./mapping.utils";

export interface RawQuotePayload {
  symbol: string;
  bidPrice?: string | number;
  askPrice?: string | number;
  lastPrice?: string | number;
  bidSize?: string | number;
  askSize?: string | number;
  time: string | number;
  sourceTimestamp?: string | number;
}

const PRICE_SCALE = 10;
const SIZE_SCALE = 10;

/** Format canonicalization only — see candle.normalizer.ts's class comment for the normalizer/validator split. All price/size fields are optional at this layer (a real quote can legitimately be one-sided, e.g. no ask during a trading halt); quote.validator.ts decides what "invalid market state" means. */
export function normalizeQuote(raw: RawQuotePayload): NormalizedQuote {
  const { symbol } = normalizeSymbol(requireField(raw.symbol, "symbol", raw));

  return {
    providerSymbol: symbol,
    bidPrice: raw.bidPrice !== undefined ? normalizeDecimal(raw.bidPrice, { maxScale: PRICE_SCALE }) : undefined,
    askPrice: raw.askPrice !== undefined ? normalizeDecimal(raw.askPrice, { maxScale: PRICE_SCALE }) : undefined,
    lastPrice: raw.lastPrice !== undefined ? normalizeDecimal(raw.lastPrice, { maxScale: PRICE_SCALE }) : undefined,
    bidSize: raw.bidSize !== undefined ? normalizeDecimal(raw.bidSize, { maxScale: SIZE_SCALE }) : undefined,
    askSize: raw.askSize !== undefined ? normalizeDecimal(raw.askSize, { maxScale: SIZE_SCALE }) : undefined,
    eventTime: normalizeTimestamp(requireField(raw.time, "time", raw)),
    sourceTimestamp: optionalField(raw.sourceTimestamp) !== null ? normalizeTimestamp(raw.sourceTimestamp as string | number) : undefined,
  };
}
