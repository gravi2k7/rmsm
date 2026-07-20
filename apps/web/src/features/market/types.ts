export type AssetClass = "EQUITY" | "ETF" | "CRYPTO" | "FOREX" | "COMMODITY" | "INDEX" | "BOND" | "OPTION" | "FUTURE";
export type InstrumentStatus = "ACTIVE" | "SUSPENDED" | "DELISTED" | "PENDING";
export type CandleInterval = "ONE_MINUTE" | "FIVE_MINUTES" | "FIFTEEN_MINUTES" | "THIRTY_MINUTES" | "ONE_HOUR" | "FOUR_HOURS" | "ONE_DAY" | "ONE_WEEK" | "ONE_MONTH";

export interface Instrument {
  id: string;
  exchangeId: string;
  symbol: string;
  name: string;
  assetClass: AssetClass;
  status: InstrumentStatus;
  currency: string;
  isin?: string | null;
  cusip?: string | null;
  tickSize?: string | null;
  lotSize?: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Prices arrive as decimal strings from the API (never floats — see
 * AI-101's Phase 1 data model doc, referenced throughout apps/api's own
 * market-data DTOs). Parsed to numbers only at the display layer via the
 * `toNumber()` helper below. */
export interface Quote {
  id: string;
  instrumentId: string;
  bidPrice?: string | null;
  askPrice?: string | null;
  lastPrice?: string | null;
  bidSize?: string | null;
  askSize?: string | null;
  eventTime: string;
  providerId: string;
  source: string;
}

export interface Exchange {
  id: string;
  code: string;
  name: string;
  timezone: string;
  country?: string | null;
  isActive: boolean;
}

export interface Candle {
  id: string;
  instrumentId: string;
  interval: CandleInterval;
  eventTime: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  isCorrection: boolean;
}

/** The market-data module's one shared paginated-list envelope
 * (`PaginationMetaDto`) — distinct from the `{ items, total, page,
 * pageSize }` shape the Phase 4A application layer uses for
 * strategies/opportunities/decisions/etc. Two genuinely different,
 * independently-built modules, not a typo. */
export interface MarketDataPage<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export function toNumber(value: string | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
