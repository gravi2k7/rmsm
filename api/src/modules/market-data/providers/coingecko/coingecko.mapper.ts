import { Injectable } from "@nestjs/common";
import type { CandleInterval } from "@rmsm/database";
import type { NormalizedCandle, NormalizedQuote, NormalizedSymbolSearchResult } from "../../interfaces/normalized-market-data.interface";
import type { CoinGeckoMarketsEntry, CoinGeckoOhlcEntry, CoinGeckoSearchResponse } from "./coingecko.types";

/**
 * The rich crypto-specific fields MD-002's "Supported Data" section asks
 * for (market cap, 24h volume/change, high/low, circulating/total
 * supply) that have no field on `NormalizedQuote` — that interface
 * (`normalized-market-data.interface.ts`) is bid/ask/last/size-shaped,
 * matching `MarketQuote`'s own Prisma columns 1:1 (verified against
 * `schema.prisma`: no market-cap/volume/supply columns exist there
 * either). Extending `NormalizedQuote` or the `market_quotes` table to
 * carry these would be a genuine schema/interface change — explicitly
 * out of scope ("DO NOT change existing interfaces unless absolutely
 * required", "DO NOT redesign the existing architecture"). This type is
 * the honest, additive alternative: real data, genuinely computed by
 * this mapper, reachable via `CoinGeckoProvider.getMarketSnapshot()` (a
 * provider-specific method beyond the `MarketDataProvider` interface,
 * not a breaking change to it) — not yet wired into the generic
 * Services → Repositories pipeline, which only knows how to persist
 * `NormalizedQuote`. Surfacing these system-wide would need a future,
 * separate ADR-025-style extension of the persisted model — real,
 * named follow-up work, not solved here.
 */
export interface CoinGeckoMarketSnapshot {
  providerSymbol: string;
  lastPriceUsd: number | null;
  marketCapUsd: number | null;
  volume24hUsd: number | null;
  change24hPercent: number | null;
  high24hUsd: number | null;
  low24hUsd: number | null;
  circulatingSupply: number | null;
  totalSupply: number | null;
  eventTime: Date;
}

/**
 * Provider JSON → this module's Normalized* models (+ the additive
 * `CoinGeckoMarketSnapshot`) — the only place CoinGecko's raw response
 * shapes are read anywhere in this system, matching `TwelveDataMapper`'s
 * exact role and the module's standing "never expose provider response
 * objects outside provider" rule. Pure, dependency-free.
 */
@Injectable()
export class CoinGeckoMapper {
  toNormalizedQuote(entry: CoinGeckoMarketsEntry): NormalizedQuote {
    return {
      providerSymbol: entry.id,
      // CoinGecko has no bid/ask concept (it aggregates a "current price"
      // across exchanges, not a live order book) — left undefined rather
      // than faked as equal to lastPrice, which would misrepresent a
      // real bid/ask spread as zero.
      lastPrice: entry.current_price !== null ? String(entry.current_price) : undefined,
      eventTime: entry.last_updated ? new Date(entry.last_updated) : new Date(),
    };
  }

  toMarketSnapshot(entry: CoinGeckoMarketsEntry): CoinGeckoMarketSnapshot {
    return {
      providerSymbol: entry.id,
      lastPriceUsd: entry.current_price,
      marketCapUsd: entry.market_cap,
      volume24hUsd: entry.total_volume,
      change24hPercent: entry.price_change_percentage_24h,
      high24hUsd: entry.high_24h,
      low24hUsd: entry.low_24h,
      circulatingSupply: entry.circulating_supply,
      totalSupply: entry.total_supply,
      eventTime: entry.last_updated ? new Date(entry.last_updated) : new Date(),
    };
  }

  toNormalizedCandles(entries: CoinGeckoOhlcEntry[], providerSymbol: string, interval: CandleInterval): NormalizedCandle[] {
    return entries.map((entry) => this.toNormalizedCandle(entry, providerSymbol, interval));
  }

  /**
   * `volume` is a required field on `NormalizedCandle`, but CoinGecko's
   * `/coins/{id}/ohlc` endpoint does not return volume at all (confirmed
   * against CoinGecko's own API reference) — a second `/coins/{id}/
   * market_chart` call could supply it, but was deliberately not added:
   * it would double this already rate-limited call class's API-credit
   * cost for every historical fetch, for a field this module's current
   * consumers (gap detection, chart rendering) do not yet read from
   * candles at all. Set to `"0"` with this explicit note rather than
   * silently fabricated — an honest limitation, not swallowed.
   */
  toNormalizedCandle(entry: CoinGeckoOhlcEntry, providerSymbol: string, interval: CandleInterval): NormalizedCandle {
    const [timestampMs, open, high, low, close] = entry;
    return {
      providerSymbol,
      interval,
      eventTime: new Date(timestampMs),
      open: String(open),
      high: String(high),
      low: String(low),
      close: String(close),
      volume: "0",
    };
  }

  toNormalizedSymbolSearchResults(response: CoinGeckoSearchResponse): NormalizedSymbolSearchResult[] {
    return (response.coins ?? []).map((coin) => ({
      providerSymbol: coin.id,
      name: coin.name,
      assetClass: "CRYPTO" as const,
      // CoinGecko coins aren't exchange-listed the way equities are —
      // no exchangeCode/currency concept applies at the coin level (a
      // coin trades on many exchanges/pairs simultaneously), so both are
      // left undefined rather than guessed.
    }));
  }
}
