import { Injectable } from "@nestjs/common";
import type { AssetClass, CandleInterval } from "@rmsm/database";
import type { NormalizedCandle, NormalizedQuote, NormalizedSymbolSearchResult } from "../../interfaces/normalized-market-data.interface";
import type {
  TwelveDataCandleValue,
  TwelveDataQuoteResponse,
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
      volume: value.volume,
    };
  }

  toNormalizedQuote(response: TwelveDataQuoteResponse): NormalizedQuote {
    return {
      providerSymbol: response.symbol,
      bidPrice: response.bid,
      askPrice: response.ask,
      lastPrice: response.close,
      eventTime: response.datetime
        ? this.parseTwelveDataDatetime(response.datetime)
        : response.timestamp
          ? new Date(response.timestamp * 1000)
          : new Date(),
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
