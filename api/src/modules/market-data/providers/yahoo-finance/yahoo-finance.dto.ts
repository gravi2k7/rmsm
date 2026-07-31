/**
 * The output shapes this provider's additive (beyond-`MarketDataProvider`)
 * methods return — MD-004 lists "DTOs" as its own deliverable, distinct
 * from the raw Yahoo response shapes in yahoo-finance.types.ts. Same
 * split CoinGecko/Alpha Vantage already use (raw provider JSON vs. the
 * shape this system actually exposes) formalized here as named,
 * standalone DTOs rather than inline mapper return types, since MD-004
 * asks for this provider to cover far more feature areas than any prior
 * one. None of these are RMSM's shared `Normalized*` contracts — they
 * carry data (fundamentals, dividends, financial statements, fund
 * metadata) those contracts have no field for, same reasoning as
 * `AlphaVantageCompanyOverview` (MD-003) and `CoinGeckoMarketSnapshot`
 * (MD-002).
 */

export interface YahooCompanyProfileDto {
  symbol: string;
  companyName?: string;
  exchange?: string;
  currency?: string;
  country?: string;
  sector?: string;
  industry?: string;
  employeeCount?: number;
  website?: string;
  businessSummary?: string;
  marketCapitalization?: number;
}

export interface YahooDividendDto {
  exDividendDate: Date;
  amount: number;
}

export interface YahooDividendSummaryDto {
  history: YahooDividendDto[];
  dividendYield?: number;
  exDividendDate?: Date;
}

export interface YahooSplitDto {
  date: Date;
  numerator: number;
  denominator: number;
  ratio: string;
}

export interface YahooEarningsDto {
  earningsDate?: Date;
  eps?: { actual?: number; estimate?: number };
  revenue?: number;
}

export interface YahooFinancialStatementLineDto {
  endDate?: Date;
  values: Record<string, number | undefined>;
}

export interface YahooEtfMetadataDto {
  fundFamily?: string;
  category?: string;
  totalNetAssets?: number;
  expenseRatio?: number;
}

/** Support is best-effort — see this file's own module-level doc comment and `YahooFinanceMapper.toFundMetadata()`; Yahoo's `fundProfile` module does not distinguish ETFs from mutual funds, so both DTOs are populated from the same raw module. */
export type YahooMutualFundMetadataDto = YahooEtfMetadataDto;

export interface YahooNewsItemDto {
  headline: string;
  publisher?: string;
  publishedAt?: Date;
  url?: string;
}
