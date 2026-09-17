import type { PaginatedResponse } from "../types/api";
import type { Candle, Instrument, Quote } from "../types/market-data";
import { ApiClient } from "./client";

export type InstrumentQuery = {
  query?: string;
  assetClass?: string;
  status?: string;
  page?: number;
  pageSize?: number;
};

export type CandleQuery = {
  instrumentId: string;
  interval: string;
  from: string;
  to: string;
  limit?: number;
  before?: string;
};

const encode = (value: string) => encodeURIComponent(value);

export class MarketDataApi {
  constructor(private readonly client: ApiClient) {}

  listInstruments(
    query: InstrumentQuery = {},
  ): Promise<PaginatedResponse<Instrument>> {
    const params = new URLSearchParams();

    if (query.query) params.set("query", query.query);
    if (query.assetClass) params.set("assetClass", query.assetClass);
    if (query.status) params.set("status", query.status);
    if (query.page !== undefined) params.set("page", String(query.page));
    if (query.pageSize !== undefined) {
      params.set("pageSize", String(query.pageSize));
    }

    const suffix = params.toString();

    return this.client.request<PaginatedResponse<Instrument>>(
      `market-data/instruments${suffix ? `?${suffix}` : ""}`,
    );
  }

  getInstrument(instrumentId: string): Promise<Instrument> {
    return this.client.request<Instrument>(
      `market-data/instruments/${encode(instrumentId)}`,
    );
  }

  getLatestQuote(instrumentId: string): Promise<Quote> {
    return this.client.request<Quote>(
      `market-data/quotes/${encode(instrumentId)}`,
    );
  }

  getLatestQuotes(instrumentIds: string[]): Promise<Quote[]> {
    const params = new URLSearchParams();

    for (const instrumentId of instrumentIds) {
      params.append("instrumentIds", instrumentId);
    }

    return this.client.request<Quote[]>(
      `market-data/quotes?${params.toString()}`,
    );
  }

  getCandles(query: CandleQuery): Promise<Candle[]> {
    const params = new URLSearchParams({
      instrumentId: query.instrumentId,
      interval: query.interval,
      from: query.from,
      to: query.to,
    });

    if (query.limit !== undefined) {
      params.set("limit", String(query.limit));
    }

    if (query.before) {
      params.set("before", query.before);
    }

    return this.client.request<Candle[]>(
      `market-data/candles?${params.toString()}`,
    );
  }
}
