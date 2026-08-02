/**
 * Raw Alpha Vantage API response shapes — read exclusively by
 * `alphavantage.client.ts` (which returns them) and
 * `alphavantage.mapper.ts` (which converts them). Nothing outside this
 * directory ever imports these, matching this module's standing "never
 * expose provider response objects outside provider" rule (MD-001).
 *
 * Alpha Vantage's JSON keys are unusually shaped — numbered, human-
 * readable strings like `"05. price"` rather than a conventional
 * camelCase/snake_case field name — a long-standing, stable
 * characteristic of this API, not a typo. Every interface below matches
 * that exact wire shape so `alphavantage.mapper.ts` can read it
 * directly.
 */

export interface AlphaVantageGlobalQuote {
  "01. symbol": string;
  "02. open": string;
  "03. high": string;
  "04. low": string;
  "05. price": string;
  "06. volume": string;
  "07. latest trading day": string;
  "08. previous close": string;
  "09. change": string;
  "10. change percent": string;
}

/** Alpha Vantage returns `{"Global Quote": {}}` (an EMPTY object, not an HTTP error) for a symbol it has no quote for — MD-003's "Malformed Response" / symbol-not-found case is detected by an empty object here, not by any HTTP status. */
export interface AlphaVantageGlobalQuoteResponse {
  "Global Quote"?: AlphaVantageGlobalQuote | Record<string, never>;
  "Error Message"?: string;
  Note?: string;
  Information?: string;
}

export interface AlphaVantageDailyBar {
  "1. open": string;
  "2. high": string;
  "3. low": string;
  "4. close": string;
  "5. volume": string;
}

/** Shared shape across TIME_SERIES_INTRADAY / _DAILY / _WEEKLY / _MONTHLY — only the top-level series key name differs per function (see `ALPHA_VANTAGE_SERIES_KEY` in alphavantage.constants.ts), so this one interface, keyed generically, covers all four. */
export interface AlphaVantageTimeSeriesResponse {
  "Meta Data"?: Record<string, string>;
  "Time Series (1min)"?: Record<string, AlphaVantageDailyBar>;
  "Time Series (5min)"?: Record<string, AlphaVantageDailyBar>;
  "Time Series (15min)"?: Record<string, AlphaVantageDailyBar>;
  "Time Series (30min)"?: Record<string, AlphaVantageDailyBar>;
  "Time Series (60min)"?: Record<string, AlphaVantageDailyBar>;
  "Time Series (Daily)"?: Record<string, AlphaVantageDailyBar>;
  "Weekly Time Series"?: Record<string, AlphaVantageDailyBar>;
  "Monthly Time Series"?: Record<string, AlphaVantageDailyBar>;
  "Error Message"?: string;
  Note?: string;
  Information?: string;
}

export interface AlphaVantageExchangeRate {
  "1. From_Currency Code": string;
  "2. From_Currency Name": string;
  "3. To_Currency Code": string;
  "4. To_Currency Name": string;
  "5. Exchange Rate": string;
  "6. Last Refreshed": string;
  "7. Time Zone": string;
  "8. Bid Price"?: string;
  "9. Ask Price"?: string;
}

export interface AlphaVantageExchangeRateResponse {
  "Realtime Currency Exchange Rate"?: AlphaVantageExchangeRate;
  "Error Message"?: string;
  Note?: string;
  Information?: string;
}

export interface AlphaVantageSearchMatch {
  "1. symbol": string;
  "2. name": string;
  "3. type": string;
  "4. region": string;
  "8. currency": string;
}

export interface AlphaVantageSearchResponse {
  bestMatches?: AlphaVantageSearchMatch[];
  "Error Message"?: string;
  Note?: string;
  Information?: string;
}

/** `OVERVIEW`'s response is a large, flat object of ~50 fundamental-data fields — only the subset this provider actually maps (see `AlphaVantageCompanyOverview` in alphavantage.mapper.ts) is declared here; the rest pass through `unknown` via the index signature rather than being individually typed, since nothing in this system reads them. */
export interface AlphaVantageOverviewResponse {
  Symbol?: string;
  Name?: string;
  Exchange?: string;
  Currency?: string;
  Country?: string;
  Sector?: string;
  Industry?: string;
  MarketCapitalization?: string;
  PERatio?: string;
  DividendYield?: string;
  EPS?: string;
  "52WeekHigh"?: string;
  "52WeekLow"?: string;
  "Error Message"?: string;
  Note?: string;
  Information?: string;
  [key: string]: string | undefined;
}

export interface AlphaVantageMarketStatusEntry {
  market_type: string;
  region: string;
  primary_exchanges: string;
  local_open: string;
  local_close: string;
  current_status: string;
  notes?: string;
}

export interface AlphaVantageMarketStatusResponse {
  endpoint?: string;
  markets?: AlphaVantageMarketStatusEntry[];
  "Error Message"?: string;
  Note?: string;
  Information?: string;
}
