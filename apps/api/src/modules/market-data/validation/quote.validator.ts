import type { NormalizedQuote } from "../interfaces/normalized-market-data.interface";
import { InvalidTimestampError, InvalidPrecisionError } from "./errors/market-data-validation.error";

export interface QuoteMarketState {
  mid: string | null;
  spread: string | null;
  /** A crossed market (bid > ask) is a genuine, if rare, invalid state — not just a formatting concern, which is why this is surfaced as data rather than silently corrected. */
  isCrossed: boolean;
}

/** Business-rule checks on an already-normalized quote — see candle.validator.ts's class comment. Both bid and ask are optional at the normalizer layer (a real quote can be one-sided); this validator only rejects when BOTH are present and internally inconsistent (crossed), never for a legitimately one-sided quote. */
export function validateQuote(quote: NormalizedQuote): QuoteMarketState {
  if (!(quote.eventTime instanceof Date) || Number.isNaN(quote.eventTime.getTime())) {
    throw new InvalidTimestampError("eventTime is not a valid Date.", { quote });
  }

  if (quote.bidPrice !== undefined && !(Number(quote.bidPrice) > 0)) {
    throw new InvalidPrecisionError(`Bid price (${quote.bidPrice}) must be positive.`, { quote });
  }
  if (quote.askPrice !== undefined && !(Number(quote.askPrice) > 0)) {
    throw new InvalidPrecisionError(`Ask price (${quote.askPrice}) must be positive.`, { quote });
  }

  if (quote.bidPrice === undefined || quote.askPrice === undefined) {
    return { mid: null, spread: null, isCrossed: false };
  }

  const bid = Number(quote.bidPrice);
  const ask = Number(quote.askPrice);
  const isCrossed = bid > ask;

  return {
    mid: ((bid + ask) / 2).toString(),
    spread: (ask - bid).toString(),
    isCrossed,
  };
}
