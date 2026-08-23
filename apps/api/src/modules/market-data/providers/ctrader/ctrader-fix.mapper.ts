import type { NormalizedQuote } from "../../interfaces/normalized-market-data.interface";
import { normalizeQuote } from "../../utils/normalizers/quote.normalizer";

export interface CTraderFixMarketDataEntry {
  readonly type: string;
  readonly price?: string;
  readonly size?: string;
}

export interface CTraderFixSnapshot {
  readonly providerSymbol: string;
  readonly entries: readonly CTraderFixMarketDataEntry[];
  readonly eventTime: Date;
}

export class CTraderFixMapper {
  toNormalizedQuote(snapshot: CTraderFixSnapshot): NormalizedQuote {
    let bidPrice: string | undefined;
    let askPrice: string | undefined;
    let bidSize: string | undefined;
    let askSize: string | undefined;

    for (const entry of snapshot.entries) {
      if (entry.type === "0") {
        bidPrice = entry.price;
        bidSize = entry.size;
      }

      if (entry.type === "1") {
        askPrice = entry.price;
        askSize = entry.size;
      }
    }

    return normalizeQuote({
      symbol: snapshot.providerSymbol,
      bidPrice,
      askPrice,
      bidSize,
      askSize,
      time: snapshot.eventTime.getTime(),
      sourceTimestamp: snapshot.eventTime.getTime(),
    });
  }
}
