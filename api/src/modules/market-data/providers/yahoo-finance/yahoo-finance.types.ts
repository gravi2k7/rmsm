/**
 * Raw Yahoo Finance response shapes — deliberately narrow (only the
 * fields this provider actually reads), since Yahoo Finance has no
 * official public API or published schema: every shape here was
 * reverse-engineered from the same unofficial `query1`/`query2`
 * endpoints every open-source Yahoo client (yfinance, yahoo-finance2,
 * etc.) uses, and Yahoo can change them without notice.
 *
 * Per MD-004's explicit instruction ("do not expose Yahoo response
 * models outside the provider"), NOTHING in this file is imported by
 * anything outside `yahoo-finance/` — `yahoo-finance.mapper.ts` is the
 * only place these shapes are read, exactly mirroring every other
 * provider's mapper-is-the-only-reader discipline since MD-001.
 */

/** GET /v8/finance/chart/{symbol} — used for quotes, historical OHLCV, and (via the `events` query param) dividends/splits. No crumb/cookie required, unlike quoteSummary. */
export interface YahooChartResponse {
  chart?: {
    result?: YahooChartResult[] | null;
    error?: { code: string; description: string } | null;
  };
}

export interface YahooChartResult {
  meta: YahooChartMeta;
  timestamp?: number[];
  indicators?: {
    quote?: [{ open?: (number | null)[]; high?: (number | null)[]; low?: (number | null)[]; close?: (number | null)[]; volume?: (number | null)[] }];
  };
  events?: {
    dividends?: Record<string, { amount: number; date: number }>;
    splits?: Record<string, { date: number; numerator: number; denominator: number; splitRatio: string }>;
  };
}

export interface YahooChartMeta {
  symbol: string;
  currency?: string;
  exchangeName?: string;
  regularMarketPrice?: number;
  previousClose?: number;
  chartPreviousClose?: number;
  regularMarketVolume?: number;
  regularMarketDayHigh?: number;
  regularMarketDayLow?: number;
  regularMarketTime?: number;
}

/** GET /v10/finance/quoteSummary/{symbol}?modules=... — company profile, financials, earnings, ETF/fund metadata. Requires a session cookie + crumb (see `getCrumb()` in yahoo-finance.client.ts); this is the part of Yahoo's unofficial surface most prone to breaking. Each module is optional in the raw response — Yahoo omits modules it has no data for rather than returning an empty object. */
export interface YahooQuoteSummaryResponse {
  quoteSummary?: {
    result?: YahooQuoteSummaryResult[] | null;
    error?: { code: string; description: string } | null;
  };
}

export interface YahooQuoteSummaryResult {
  assetProfile?: YahooAssetProfile;
  summaryDetail?: YahooSummaryDetail;
  price?: YahooPriceModule;
  defaultKeyStatistics?: YahooDefaultKeyStatistics;
  incomeStatementHistory?: { incomeStatementHistory?: YahooIncomeStatementEntry[] };
  balanceSheetHistory?: { balanceSheetStatements?: YahooBalanceSheetEntry[] };
  cashflowStatementHistory?: { cashflowStatements?: YahooCashFlowEntry[] };
  calendarEvents?: { earnings?: { earningsDate?: YahooRawValue[] } };
  earnings?: { earningsChart?: { quarterly?: YahooEarningsQuarter[] } };
  fundProfile?: YahooFundProfile;
}

/** Yahoo's quoteSummary numeric fields are consistently `{ raw: number, fmt: string }` — `raw` is the only field this provider reads (see `readRaw()` in yahoo-finance.mapper.ts). */
export interface YahooRawValue {
  raw?: number;
  fmt?: string;
}

export interface YahooAssetProfile {
  sector?: string;
  industry?: string;
  fullTimeEmployees?: number;
  website?: string;
  longBusinessSummary?: string;
  country?: string;
}

export interface YahooSummaryDetail {
  previousClose?: YahooRawValue;
  open?: YahooRawValue;
  dayHigh?: YahooRawValue;
  dayLow?: YahooRawValue;
  volume?: YahooRawValue;
  averageVolume?: YahooRawValue;
  marketCap?: YahooRawValue;
  dividendYield?: YahooRawValue;
  exDividendDate?: YahooRawValue;
  currency?: string;
}

export interface YahooPriceModule {
  symbol?: string;
  longName?: string;
  shortName?: string;
  exchangeName?: string;
  currency?: string;
  regularMarketPrice?: YahooRawValue;
  marketCap?: YahooRawValue;
}

export interface YahooDefaultKeyStatistics {
  lastSplitDate?: YahooRawValue;
  lastSplitFactor?: string;
}

export interface YahooIncomeStatementEntry {
  endDate?: YahooRawValue;
  totalRevenue?: YahooRawValue;
  costOfRevenue?: YahooRawValue;
  grossProfit?: YahooRawValue;
  operatingIncome?: YahooRawValue;
  netIncome?: YahooRawValue;
}

export interface YahooBalanceSheetEntry {
  endDate?: YahooRawValue;
  totalAssets?: YahooRawValue;
  totalLiab?: YahooRawValue;
  totalStockholderEquity?: YahooRawValue;
  cash?: YahooRawValue;
}

export interface YahooCashFlowEntry {
  endDate?: YahooRawValue;
  totalCashFromOperatingActivities?: YahooRawValue;
  capitalExpenditures?: YahooRawValue;
  freeCashFlow?: YahooRawValue;
}

export interface YahooEarningsQuarter {
  date?: string;
  actual?: YahooRawValue;
  estimate?: YahooRawValue;
}

/** ETF and mutual fund metadata share the same `fundProfile` module — `categoryName`/`totalNetAssets`/`feesExpensesInvestment.annualReportExpenseRatio` are populated for both; `topHoldings` (not modeled here — unused by this provider) is the only module genuinely ETF-specific. Mutual-fund-only rows are distinguished at the RMSM `AssetClass` level, not by a different Yahoo module. */
export interface YahooFundProfile {
  family?: string;
  categoryName?: string;
  legalType?: string;
  feesExpensesInvestment?: { annualReportExpenseRatio?: YahooRawValue };
  totalNetAssets?: YahooRawValue;
}

/** GET /v1/finance/search?q=... — used only for symbol search and (via its `news` array) optional news metadata. No crumb required. */
export interface YahooSearchResponse {
  quotes?: YahooSearchQuote[];
  news?: YahooSearchNewsItem[];
}

export interface YahooSearchQuote {
  symbol: string;
  shortname?: string;
  longname?: string;
  quoteType?: string;
  exchange?: string;
}

export interface YahooSearchNewsItem {
  title: string;
  publisher?: string;
  link?: string;
  providerPublishTime?: number;
}
