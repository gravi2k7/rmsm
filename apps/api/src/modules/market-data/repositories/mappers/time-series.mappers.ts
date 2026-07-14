import type { MarketCandle, MarketQuote, MarketTick, CorporateAction } from "@rmsm/database";
import type {
  MarketCandleModel,
  MarketQuoteModel,
  MarketTickModel,
  CorporateActionModel,
} from "../../interfaces/models/time-series.models";

/** See reference-data.mappers.ts's header comment — same pattern, applied to the four Decimal-heavy time-series tables. */

export function toMarketCandleModel(row: MarketCandle): MarketCandleModel {
  return {
    ...row,
    open: row.open.toString(),
    high: row.high.toString(),
    low: row.low.toString(),
    close: row.close.toString(),
    volume: row.volume.toString(),
  };
}

export function toMarketQuoteModel(row: MarketQuote): MarketQuoteModel {
  return {
    ...row,
    bidPrice: row.bidPrice !== null ? row.bidPrice.toString() : null,
    askPrice: row.askPrice !== null ? row.askPrice.toString() : null,
    lastPrice: row.lastPrice !== null ? row.lastPrice.toString() : null,
    bidSize: row.bidSize !== null ? row.bidSize.toString() : null,
    askSize: row.askSize !== null ? row.askSize.toString() : null,
  };
}

export function toMarketTickModel(row: MarketTick): MarketTickModel {
  return {
    ...row,
    price: row.price.toString(),
    size: row.size.toString(),
  };
}

export function toCorporateActionModel(row: CorporateAction): CorporateActionModel {
  return {
    ...row,
    value: row.value.toString(),
  };
}
