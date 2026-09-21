import type { CandleInterval } from "@rmsm/database";

export const CTRADER_TRENDBAR_PERIOD = {
  ONE_MINUTE: 1,
  FIVE_MINUTES: 5,
  FIFTEEN_MINUTES: 7,
  THIRTY_MINUTES: 8,
  ONE_HOUR: 9,
  FOUR_HOURS: 10,
  ONE_DAY: 12,
  ONE_WEEK: 13,
  ONE_MONTH: 14,
} as const satisfies Record<CandleInterval, number>;

export interface CTraderOpenApiTrendbar {
  volume: string | number;
  low?: string | number;
  deltaOpen?: string | number;
  deltaClose?: string | number;
  deltaHigh?: string | number;
  utcTimestampInMinutes?: string | number;
}

export interface CTraderOpenApiTrendbarsResponse {
  trendbar?: CTraderOpenApiTrendbar[];
  hasMore?: boolean;
}

export interface CTraderOpenApiHistoricalRequest {
  accountId: number;
  symbolId: number;
  period: number;
  fromTimestamp: number;
  toTimestamp: number;
  count?: number;
}

export interface CTraderOpenApiClientOptions {
  host: string;
  port: number;
  clientId: string;
  clientSecret: string;
  accessToken: string;
  accountId: number;
  connectTimeoutMs: number;
  requestTimeoutMs: number;
}
