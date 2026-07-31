import { Injectable } from "@nestjs/common";
import type { CandleInterval } from "@rmsm/database";
import type { NormalizedCandle, NormalizedQuote, NormalizedSymbolSearchResult } from "../../interfaces/normalized-market-data.interface";
import type {
  AlphaVantageGlobalQuote,
  AlphaVantageDailyBar,
  AlphaVantageExchangeRate,
  AlphaVantageSearchMatch,
  AlphaVantageOverviewResponse,
  AlphaVantageMarketStatusEntry,
} from "./alphavantage.types";

/**
 * MD-003's "Company Overview" supported-data item — like CoinGecko's
 * `CoinGeckoMarketSnapshot` (MD-002), this has no home in
 * `NormalizedQuote` (fundamentals — sector, PE ratio, dividend yield,
 * 52-week range — are a completely different shape than a bid/ask/last
 * quote) and is deliberately NOT forced into it. Reachable via
 * `AlphaVantageProvider.getCompanyOverview()`, an additive method
 * beyond `MarketDataProvider`, same pattern as `getMarketSnapshot()`.
 */
export interface AlphaVantageCompanyOverview {
  symbol: string;
  name?: string;
  exchange?: string;
  currency?: string;
  country?: string;
  sector?: string;
  industry?: string;
  marketCapitalization?: string;
  peRatio?: string;
  dividendYield?: string;
  eps?: string;
  week52High?: string;
  week52Low?: string;
}

/**
 * Provider JSON → this module's Normalized* models (+ the additive
 * `AlphaVantageCompanyOverview` / market-status pass-through) — the only
 * place Alpha Vantage's raw response shapes are read anywhere in this
 * system, matching every mapper in this module since MD-001. Pure,
 * dependency-free.
 */
@Injectable()
export class AlphaVantageMapper {
  toNormalizedQuote(quote: AlphaVantageGlobalQuote): NormalizedQuote {
    return {
      providerSymbol: quote["01. symbol"],
      lastPrice: quote["05. price"],
      eventTime: this.parseTradingDay(quote["07. latest trading day"]),
    };
  }

  /** Forex/crypto exchange rates map onto the same `NormalizedQuote` shape as an equity quote — `lastPrice` is the exchange rate, `providerSymbol` is reconstructed as `"FROM/TO"` to match this provider's own pair convention (see `parseCurrencyPair()` in alphavantage.constants.ts). Bid/ask are populated when Alpha Vantage's response includes them (it does not always). */
  toNormalizedQuoteFromExchangeRate(rate: AlphaVantageExchangeRate): NormalizedQuote {
    return {
      providerSymbol: `${rate["1. From_Currency Code"]}/${rate["3. To_Currency Code"]}`,
      lastPrice: rate["5. Exchange Rate"],
      bidPrice: rate["8. Bid Price"],
      askPrice: rate["9. Ask Price"],
      eventTime: this.parseTradingDay(rate["6. Last Refreshed"]),
    };
  }

  toNormalizedCandles(series: Record<string, AlphaVantageDailyBar>, providerSymbol: string, interval: CandleInterval): NormalizedCandle[] {
    return Object.entries(series).map(([datetime, bar]) => this.toNormalizedCandle(datetime, bar, providerSymbol, interval));
  }

  toNormalizedCandle(datetime: string, bar: AlphaVantageDailyBar, providerSymbol: string, interval: CandleInterval): NormalizedCandle {
    return {
      providerSymbol,
      interval,
      eventTime: this.parseTradingDay(datetime),
      open: bar["1. open"],
      high: bar["2. high"],
      low: bar["3. low"],
      close: bar["4. close"],
      volume: bar["5. volume"],
    };
  }

  toNormalizedSymbolSearchResults(matches: AlphaVantageSearchMatch[]): NormalizedSymbolSearchResult[] {
    return matches.map((match) => this.toNormalizedSymbolSearchResult(match));
  }

  toNormalizedSymbolSearchResult(match: AlphaVantageSearchMatch): NormalizedSymbolSearchResult {
    return {
      providerSymbol: match["1. symbol"],
      name: match["2. name"],
      assetClass: this.toAssetClass(match["3. type"]),
      currency: match["8. currency"],
    };
  }

  toCompanyOverview(response: AlphaVantageOverviewResponse): AlphaVantageCompanyOverview {
    return {
      symbol: response.Symbol ?? "",
      name: response.Name,
      exchange: response.Exchange,
      currency: response.Currency,
      country: response.Country,
      sector: response.Sector,
      industry: response.Industry,
      marketCapitalization: response.MarketCapitalization,
      peRatio: response.PERatio,
      dividendYield: response.DividendYield,
      eps: response.EPS,
      week52High: response["52WeekHigh"],
      week52Low: response["52WeekLow"],
    };
  }

  /** Market status entries pass through close to as-is — Alpha Vantage's own field names (`market_type`, `current_status`, etc.) are already reasonably self-describing, and no Normalized* contract in this module models "is this market open" today, so there is nothing more specific to map onto. */
  toMarketStatusEntries(entries: AlphaVantageMarketStatusEntry[]): AlphaVantageMarketStatusEntry[] {
    return entries;
  }

  /** "2026-01-02 16:00:01" (intraday) or "2026-01-02" (daily/weekly/monthly/exchange-rate-last-refreshed) — Alpha Vantage does not publish a UTC offset on these fields (they are exchange-local or, for FX, provider-server time), the same honest limitation `TwelveDataMapper`/`CoinGeckoMapper` document for their own provider's timestamps: parsed as UTC rather than left unparsed, with this comment flagging the approximation rather than silently making it. */
  private parseTradingDay(value: string): Date {
    if (!value) return new Date();
    const iso = value.length === 10 ? `${value}T00:00:00Z` : `${value.replace(" ", "T")}Z`;
    const parsed = new Date(iso);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  }

  private toAssetClass(type: string): NormalizedSymbolSearchResult["assetClass"] {
    const normalized = type.toLowerCase();
    if (normalized.includes("etf")) return "ETF";
    if (normalized.includes("crypto")) return "CRYPTO";
    if (normalized.includes("forex") || normalized.includes("currency")) return "FOREX";
    return "EQUITY";
  }
}
