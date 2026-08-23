import { Injectable } from "@nestjs/common";
import type { CandleInterval } from "@rmsm/database";
import type {
  NormalizedCandle,
  NormalizedQuote,
  NormalizedSymbolSearchResult,
} from "../../interfaces/normalized-market-data.interface";
import type {
  BinanceExchangeInfoResponse,
  BinanceKline,
} from "./binance.types";

@Injectable()
export class BinanceMapper {
  toNormalizedCandles(
    entries: BinanceKline[],
    providerSymbol: string,
    interval: CandleInterval,
  ): NormalizedCandle[] {
    return entries.map((entry) => this.toNormalizedCandle(
      entry,
      providerSymbol,
      interval,
    ));
  }

  toNormalizedCandle(
    entry: BinanceKline,
    providerSymbol: string,
    interval: CandleInterval,
  ): NormalizedCandle {
    const [
      openTime,
      open,
      high,
      low,
      close,
      volume,
    ] = entry;

    return {
      providerSymbol,
      interval,
      eventTime: new Date(openTime),
      open,
      high,
      low,
      close,
      volume,
    };
  }

  toNormalizedQuote(
    providerSymbol: string,
    price: string,
  ): NormalizedQuote {
    return {
      providerSymbol,
      lastPrice: price,
      eventTime: new Date(),
    };
  }

  toNormalizedSymbolSearchResults(
    response: BinanceExchangeInfoResponse,
  ): NormalizedSymbolSearchResult[] {
    return (response.symbols ?? [])
      .filter((symbol) => symbol.status === "TRADING")
      .map((symbol) => ({
        providerSymbol: symbol.symbol,
        name: symbol.symbol,
        assetClass: "CRYPTO" as const,
        currency: symbol.quoteAsset,
      }));
  }
}
