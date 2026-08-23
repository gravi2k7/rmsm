import { Injectable } from "@nestjs/common";
import type { AssetClass, CandleInterval } from "@rmsm/database";
import type {
  NormalizedCandle,
  NormalizedQuote,
  NormalizedSymbolSearchResult,
} from "../../interfaces/normalized-market-data.interface";
import type {
  NormalizedExchangeInfo,
  NormalizedInstrumentReference,
} from "../../interfaces/reference-data-provider.interface";
import type {
  TwelveDataCandleValue,
  TwelveDataCommodityItem,
  TwelveDataCommoditiesResponse,
  TwelveDataCryptocurrencyItem,
  TwelveDataCryptocurrenciesResponse,
  TwelveDataEtfItem,
  TwelveDataEtfResponse,
  TwelveDataExchangeItem,
  TwelveDataExchangesResponse,
  TwelveDataForexPairItem,
  TwelveDataForexPairsResponse,
  TwelveDataQuoteResponse,
  TwelveDataStockItem,
  TwelveDataStockResponse,
  TwelveDataSymbolSearchItem,
  TwelveDataSymbolSearchResponse,
  TwelveDataTimeSeriesResponse,
} from "./twelve-data.client";

/** Twelve Data's `instrument_type` strings (symbol_search) → this
 * system's AssetClass — unmapped/unknown instrument types fall back to
 * EQUITY (Twelve Data's own catalog is overwhelmingly equities; an
 * honest default, not a silent misclassification of a genuinely
 * different asset class the map is missing). */
const TWELVE_DATA_INSTRUMENT_TYPE_TO_ASSET_CLASS: Record<string, AssetClass> = {
  "Common Stock": "EQUITY",
  "ETF": "ETF",
  "Digital Currency": "CRYPTO",
  "Physical Currency": "FOREX",
  "Index": "INDEX",
  "Commodity": "COMMODITY",
  "Bond": "BOND",
  "Option": "OPTION",
  "Future": "FUTURE",
};

/**
 * Provider JSON → this module's NormalizedCandle / NormalizedQuote /
 * NormalizedSymbolSearchResult models — the ONLY place Twelve Data's raw
 * response shapes are read anywhere in this system (twelve-data.client.ts
 * returns them, but only this mapper and this provider's own tests ever
 * import those types); everything past this file speaks Normalized*
 * exclusively, per MD-001's "never expose provider response objects
 * outside provider" rule. A pure, dependency-free transform — no
 * network, no config, no injected services — matching this module's
 * existing normalization-layer convention (Phase 2C, per the
 * architecture doc: "normalization/validation, pure functions, no
 * module wiring needed").
 */
@Injectable()
export class TwelveDataMapper {
  toNormalizedCandles(response: TwelveDataTimeSeriesResponse, providerSymbol: string, interval: CandleInterval): NormalizedCandle[] {
    return (response.values ?? []).map((value) => this.toNormalizedCandle(value, providerSymbol, interval));
  }

  toNormalizedCandle(value: TwelveDataCandleValue, providerSymbol: string, interval: CandleInterval): NormalizedCandle {
    return {
      providerSymbol,
      interval,
      eventTime: this.parseTwelveDataDatetime(value.datetime),
      open: value.open,
      high: value.high,
      low: value.low,
      close: value.close,
      volume: value.volume ?? "0",
    };
  }

  toNormalizedQuote(response: TwelveDataQuoteResponse): NormalizedQuote {
    const quoteTimestamp =
      typeof response.last_quote_at === "number"
        ? new Date(response.last_quote_at * 1000)
        : undefined;

    const providerTimestamp =
      typeof response.timestamp === "number"
        ? new Date(response.timestamp * 1000)
        : undefined;

    const eventTime =
      quoteTimestamp ??
      providerTimestamp ??
      (response.datetime
        ? this.parseTwelveDataDatetime(response.datetime)
        : new Date());

    return {
      providerSymbol: response.symbol,
      bidPrice: response.bid,
      askPrice: response.ask,
      lastPrice: response.close,
      eventTime,
      ...(quoteTimestamp
        ? { sourceTimestamp: quoteTimestamp }
        : providerTimestamp
          ? { sourceTimestamp: providerTimestamp }
          : {}),
    };
  }

  toNormalizedSymbolSearchResults(response: TwelveDataSymbolSearchResponse): NormalizedSymbolSearchResult[] {
    return (response.data ?? []).map((item) => this.toNormalizedSymbolSearchResult(item));
  }

  toNormalizedSymbolSearchResult(item: TwelveDataSymbolSearchItem): NormalizedSymbolSearchResult {
    return {
      providerSymbol: item.symbol,
      name: item.instrument_name,
      assetClass: this.toAssetClass(item.instrument_type),
      exchangeCode: item.mic_code ?? item.exchange,
      currency: item.currency,
    };
  }

  toNormalizedExchanges(
    response: TwelveDataExchangesResponse,
  ): NormalizedExchangeInfo[] {
    return (response.data ?? []).map((item) =>
      this.toNormalizedExchange(item),
    );
  }

  toNormalizedExchange(
    item: TwelveDataExchangeItem,
  ): NormalizedExchangeInfo {
    return {
      code: item.code,
      name: item.name || item.title,
      timezone: item.timezone,
      country: item.country,
    };
  }

  toNormalizedStocks(
    response: TwelveDataStockResponse,
  ): NormalizedInstrumentReference[] {
    return (response.data ?? [])
      .filter((item) => Boolean(item.currency))
      .map((item) => this.toNormalizedStock(item));
  }

  toNormalizedStock(
    item: TwelveDataStockItem,
  ): NormalizedInstrumentReference {
    return {
      providerSymbol: item.symbol,
      name: item.name,
      assetClass: "EQUITY",
      currency: item.currency!,
      exchangeCode: item.mic_code ?? item.exchange,
    };
  }

  toNormalizedEtfs(
    response: TwelveDataEtfResponse,
  ): NormalizedInstrumentReference[] {
    return (response.data ?? [])
      .filter((item) => Boolean(item.currency))
      .map((item) => this.toNormalizedEtf(item));
  }

  toNormalizedEtf(
    item: TwelveDataEtfItem,
  ): NormalizedInstrumentReference {
    return {
      providerSymbol: item.symbol,
      name: item.name,
      assetClass: "ETF",
      currency: item.currency!,
      exchangeCode: item.mic_code ?? item.exchange,
      isin: item.isin,
      cusip: item.cusip,
    };
  }

  toNormalizedForexPairs(
    response: TwelveDataForexPairsResponse,
  ): NormalizedInstrumentReference[] {
    return (response.data ?? [])
      .filter((item) => Boolean(item.currency_quote))
      .map((item) => this.toNormalizedForexPair(item));
  }

  toNormalizedForexPair(
    item: TwelveDataForexPairItem,
  ): NormalizedInstrumentReference {
    return {
      providerSymbol: item.symbol,
      name: item.symbol,
      assetClass: "FOREX",
      currency: item.currency_quote!,
    };
  }

  toNormalizedCryptocurrencies(
    response: TwelveDataCryptocurrenciesResponse,
  ): NormalizedInstrumentReference[] {
    return (response.data ?? [])
      .filter((item) => Boolean(item.currency_quote))
      .map((item) => this.toNormalizedCryptocurrency(item));
  }

  toNormalizedCryptocurrency(
    item: TwelveDataCryptocurrencyItem,
  ): NormalizedInstrumentReference {
    return {
      providerSymbol: item.symbol,
      name: item.symbol,
      assetClass: "CRYPTO",
      currency: item.currency_quote!,
      exchangeCode: item.available_exchanges?.[0],
    };
  }

  toNormalizedCommodities(
    response: TwelveDataCommoditiesResponse,
  ): NormalizedInstrumentReference[] {
    return (response.data ?? []).flatMap((item) => {
      try {
        return [this.toNormalizedCommodity(item)];
      } catch (error) {
        if (
          error instanceof Error &&
          error.message ===
            `Unable to determine commodity quote currency for ${item.symbol}`
        ) {
          return [];
        }

        throw error;
      }
    });
  }

  toNormalizedCommodity(
    item: TwelveDataCommodityItem,
  ): NormalizedInstrumentReference {
    const quoteCurrency = item.symbol.includes("/")
      ? item.symbol.split("/").at(-1)?.toUpperCase()
      : undefined;

    const currency = quoteCurrency ?? item.currency;

    if (!currency) {
      throw new Error(
        `Unable to determine commodity quote currency for ${item.symbol}`,
      );
    }

    return {
      providerSymbol: item.symbol,
      name: item.name || item.symbol,
      assetClass: "COMMODITY",
      currency,
      exchangeCode: undefined,
    };
  }

  /**
   * Twelve Data's `datetime` field is either `"YYYY-MM-DD HH:mm:ss"`
   * (intraday, exchange-local — Twelve Data does not publish a UTC
   * offset on this field) or `"YYYY-MM-DD"` (1day interval). Per this
   * module's "every timestamp crossing a contract boundary is UTC"
   * standard (historical-data-client.interface.ts's own doc comment),
   * this parses the string as if it were already UTC. That is an honest
   * limitation, not a silently-swallowed bug: exact exchange-local-to-UTC
   * conversion would need `Exchange`/`TradingSession` timezone data this
   * mapper deliberately has no access to (a pure, dependency-free
   * transform, per this module's existing convention) — a future
   * service-layer pass that has that data available is the right place
   * to correct for it, not this file.
   */
  private parseTwelveDataDatetime(datetime: string): Date {
    const iso = datetime.length === 10 ? `${datetime}T00:00:00Z` : `${datetime.replace(" ", "T")}Z`;
    return new Date(iso);
  }

  private toAssetClass(instrumentType?: string): AssetClass {
    if (!instrumentType) return "EQUITY";
    return TWELVE_DATA_INSTRUMENT_TYPE_TO_ASSET_CLASS[instrumentType] ?? "EQUITY";
  }
}
