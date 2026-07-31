import type { MarketDataProviderType } from "@rmsm/database";
import type { MarketDataProvider } from "../../interfaces/market-data-provider.interface";
import type { ProviderMetadata } from "../../interfaces/provider-metadata.interface";
import type { HistoricalDataClient, HistoricalDataRequest, HistoricalDataResponse } from "../../interfaces/historical-data-client.interface";
import type { QuoteClient } from "../../interfaces/quote-client.interface";
import type { SymbolSearchClient } from "../../interfaces/symbol-search-client.interface";
import type { NormalizedQuote, NormalizedSymbolSearchResult } from "../../interfaces/normalized-market-data.interface";
import { YahooFinanceClient } from "./yahoo-finance.client";
import { YahooFinanceMapper } from "./yahoo-finance.mapper";
import { YahooFinanceErrorMapper } from "./yahoo-finance.error-mapper";
import type { YahooFinanceApiError } from "./yahoo-finance.error-mapper";
import { YahooFinanceRateLimiter } from "./yahoo-finance.rate-limit";
import { YahooFinanceHealthProvider } from "./yahoo-finance.health";
import { YahooFinanceCacheService } from "./yahoo-finance.cache";
import type { YahooQuoteSummaryResult } from "./yahoo-finance.types";
import type {
  YahooCompanyProfileDto,
  YahooDividendSummaryDto,
  YahooSplitDto,
  YahooEarningsDto,
  YahooFinancialStatementLineDto,
  YahooEtfMetadataDto,
  YahooMutualFundMetadataDto,
  YahooNewsItemDto,
} from "./yahoo-finance.dto";
import {
  YAHOO_ASSET_CLASSES,
  YAHOO_CHART_INTERVAL,
  YAHOO_QUOTE_TTL_MULTIPLIER,
  YAHOO_HISTORICAL_TTL_MULTIPLIER,
  YAHOO_DIVIDENDS_TTL_MULTIPLIER,
  YAHOO_SPLITS_TTL_MULTIPLIER,
  YAHOO_QUOTE_SUMMARY_TTL_MULTIPLIER,
  YAHOO_NEWS_TTL_MULTIPLIER,
} from "./yahoo-finance.constants";

/**
 * Yahoo Finance — MD-004's fourth real `MarketDataProvider`, alongside
 * Twelve Data, CoinGecko, and Alpha Vantage. Per MD-004's own explicit
 * "Provider Purpose" and "IMPORTANT IMPLEMENTATION NOTE" sections, this
 * provider is deliberately supplementary: `quoteClient` and
 * `historicalDataClient` ARE implemented (Yahoo Finance's chart endpoint
 * genuinely supports both, and `MarketDataProvider` has no way to
 * express "implements this capability but callers shouldn't prefer it"),
 * but Twelve Data and Alpha Vantage remain the primary quote sources —
 * this provider exists mainly for its many additive methods (company
 * profile, dividends, splits, earnings, financial statements, ETF/fund
 * metadata, optional news), none of which any other provider in this
 * module offers.
 *
 * Per MD-004's instruction to "not expose Yahoo response models outside
 * the provider" and "keep the provider easily replaceable": every method
 * here returns either an RMSM `Normalized*` contract or one of this
 * provider's own DTOs (yahoo-finance.dto.ts) — never a raw
 * `Yahoo*Response`/`Yahoo*Result` type from yahoo-finance.types.ts.
 *
 * Not `@Injectable()` — constructed manually by
 * `YahooFinanceRegistrarService`, matching every provider class in this
 * module since `InternalFeedProvider`.
 */
export class YahooFinanceProvider implements MarketDataProvider {
  readonly type: MarketDataProviderType = "YAHOO_FINANCE";
  readonly metadata: ProviderMetadata;

  readonly historicalDataClient: HistoricalDataClient = {
    fetchCandles: async (request: HistoricalDataRequest): Promise<HistoricalDataResponse> => {
      const cacheKey = `historical:${request.providerSymbol}:${request.interval}`;
      const response = await this.cache.getOrSet(cacheKey, this.historicalTtlMs(), () =>
        this.client.getChart(request.providerSymbol, request.interval, {
          period1: Math.floor(request.from.getTime() / 1000),
          period2: Math.floor(request.to.getTime() / 1000),
        }),
      );
      const result = response.chart?.result?.[0];
      if (!result) return { candles: [] };
      return { candles: this.mapper.toNormalizedCandles(result, request.providerSymbol, request.interval) };
    },
  };

  /** Explicitly NOT the primary quote source for this platform — see this class's own doc comment. Implemented because Yahoo's chart endpoint genuinely supports it and `MarketDataProvider` requires a real implementation if exposed at all, not a stub. */
  readonly quoteClient: QuoteClient = {
    fetchLatestQuote: async (providerSymbol: string): Promise<NormalizedQuote> => {
      const cacheKey = `quote:${providerSymbol}`;
      const response = await this.cache.getOrSet(cacheKey, this.quoteTtlMs(), () => this.client.getChart(providerSymbol, "ONE_DAY", { range: "5d" }));
      const result = response.chart?.result?.[0];
      if (!result) throw this.invalidSymbolError(providerSymbol);
      return this.mapper.toNormalizedQuote(result.meta);
    },
    fetchLatestQuotes: async (providerSymbols: string[]): Promise<NormalizedQuote[]> => {
      return Promise.all(providerSymbols.map((symbol) => this.quoteClient.fetchLatestQuote(symbol)));
    },
  };

  readonly symbolSearchClient: SymbolSearchClient = {
    search: async (query: string, limit = 10): Promise<NormalizedSymbolSearchResult[]> => {
      const response = await this.client.search(query);
      return this.mapper.toNormalizedSymbolSearchResults(response.quotes ?? []).slice(0, limit);
    },
  };

  readonly rateLimitPolicy: YahooFinanceRateLimiter;
  readonly errorMapper: YahooFinanceErrorMapper;
  readonly healthProvider: YahooFinanceHealthProvider;

  constructor(
    private readonly enabledFlag: boolean,
    private readonly client: YahooFinanceClient,
    private readonly mapper: YahooFinanceMapper,
    private readonly cache: YahooFinanceCacheService,
    private readonly baseCacheTtlMs: number,
    rateLimiter: YahooFinanceRateLimiter,
    errorMapper: YahooFinanceErrorMapper,
    healthProvider: YahooFinanceHealthProvider,
  ) {
    this.rateLimitPolicy = rateLimiter;
    this.errorMapper = errorMapper;
    this.healthProvider = healthProvider;

    this.metadata = {
      name: "Yahoo Finance",
      version: "1.0.0",
      marketsSupported: ["US", "GLOBAL"],
      assetClasses: [...YAHOO_ASSET_CLASSES],
      timeframes: Object.keys(YAHOO_CHART_INTERVAL) as ProviderMetadata["timeframes"],
      supportsHistorical: true,
      supportsQuotes: true,
      supportsTicks: false,
      supportsStreaming: false,
      supportsCorporateActions: true,
      rateLimits: { requestsPerMinute: rateLimiter.requestsPerMinute },
      healthStatus: "unknown",
    };
  }

  /** Driven by `YAHOO_ENABLED` (MD-004's own Configuration example), NOT by credential presence — Yahoo Finance has no API key to be absent. This is a third distinct `enabled` convention in this module (Twelve Data/Alpha Vantage: key-presence-gated; CoinGecko: always true; Yahoo: explicit config flag), each the honest reflection of a different provider's real access model. */
  get enabled(): boolean {
    return this.enabledFlag;
  }

  /** MD-004 "Company Profile". Additive — see this class's own doc comment. */
  async getCompanyProfile(providerSymbol: string): Promise<YahooCompanyProfileDto> {
    const result = await this.fetchQuoteSummary(providerSymbol);
    return this.mapper.toCompanyProfile(providerSymbol, result);
  }

  /** MD-004 "Dividends" — history from the chart endpoint's events, yield/ex-date from quoteSummary; combined in the mapper. */
  async getDividends(providerSymbol: string): Promise<YahooDividendSummaryDto> {
    const cacheKey = `dividends:${providerSymbol}`;
    const [chartResponse, summary] = await this.cache.getOrSet(cacheKey, this.dividendsTtlMs(), async () => {
      const [chart, quoteSummary] = await Promise.all([
        this.client.getChart(providerSymbol, "ONE_DAY", { includeEvents: true, range: "5y" }),
        this.fetchQuoteSummary(providerSymbol),
      ]);
      return [chart, quoteSummary] as const;
    });
    return this.mapper.toDividendSummary(chartResponse.chart?.result?.[0], summary.summaryDetail);
  }

  /** MD-004 "Stock Splits". */
  async getSplits(providerSymbol: string): Promise<YahooSplitDto[]> {
    const cacheKey = `splits:${providerSymbol}`;
    const chartResponse = await this.cache.getOrSet(cacheKey, this.splitsTtlMs(), () =>
      this.client.getChart(providerSymbol, "ONE_DAY", { includeEvents: true, range: "10y" }),
    );
    return this.mapper.toSplits(chartResponse.chart?.result?.[0]);
  }

  /** MD-004 "Earnings". */
  async getEarnings(providerSymbol: string): Promise<YahooEarningsDto> {
    const result = await this.fetchQuoteSummary(providerSymbol);
    return this.mapper.toEarnings(result);
  }

  /** MD-004 "Financial Statements" — Income Statement. */
  async getIncomeStatement(providerSymbol: string): Promise<YahooFinancialStatementLineDto[]> {
    const result = await this.fetchQuoteSummary(providerSymbol);
    return this.mapper.toIncomeStatement(result.incomeStatementHistory?.incomeStatementHistory);
  }

  /** MD-004 "Financial Statements" — Balance Sheet. */
  async getBalanceSheet(providerSymbol: string): Promise<YahooFinancialStatementLineDto[]> {
    const result = await this.fetchQuoteSummary(providerSymbol);
    return this.mapper.toBalanceSheet(result.balanceSheetHistory?.balanceSheetStatements);
  }

  /** MD-004 "Financial Statements" — Cash Flow Statement. */
  async getCashFlowStatement(providerSymbol: string): Promise<YahooFinancialStatementLineDto[]> {
    const result = await this.fetchQuoteSummary(providerSymbol);
    return this.mapper.toCashFlowStatement(result.cashflowStatementHistory?.cashflowStatements);
  }

  /** MD-004 "ETF Metadata". */
  async getEtfMetadata(providerSymbol: string): Promise<YahooEtfMetadataDto> {
    const result = await this.fetchQuoteSummary(providerSymbol);
    return this.mapper.toFundMetadata(result.fundProfile);
  }

  /** MD-004 "Mutual Fund Metadata" — "support when available"; Yahoo's `fundProfile` module covers both ETFs and mutual funds identically (see `YahooMutualFundMetadataDto`'s doc comment), so this delegates to the same mapping. */
  async getMutualFundMetadata(providerSymbol: string): Promise<YahooMutualFundMetadataDto> {
    return this.getEtfMetadata(providerSymbol);
  }

  /** MD-004 "News Metadata (Optional)". */
  async getNews(providerSymbol: string): Promise<YahooNewsItemDto[]> {
    const cacheKey = `news:${providerSymbol}`;
    const response = await this.cache.getOrSet(cacheKey, this.newsTtlMs(), () => this.client.search(providerSymbol));
    return this.mapper.toNews(response.news ?? []);
  }

  private async fetchQuoteSummary(providerSymbol: string): Promise<YahooQuoteSummaryResult> {
    const cacheKey = `quotesummary:${providerSymbol}`;
    const response = await this.cache.getOrSet(cacheKey, this.quoteSummaryTtlMs(), () => this.client.getQuoteSummary(providerSymbol));
    const result = response.quoteSummary?.result?.[0];
    if (!result) throw this.invalidSymbolError(providerSymbol);
    return result;
  }

  private quoteTtlMs(): number {
    return this.baseCacheTtlMs * YAHOO_QUOTE_TTL_MULTIPLIER;
  }

  private historicalTtlMs(): number {
    return this.baseCacheTtlMs * YAHOO_HISTORICAL_TTL_MULTIPLIER;
  }

  private dividendsTtlMs(): number {
    return this.baseCacheTtlMs * YAHOO_DIVIDENDS_TTL_MULTIPLIER;
  }

  private splitsTtlMs(): number {
    return this.baseCacheTtlMs * YAHOO_SPLITS_TTL_MULTIPLIER;
  }

  private quoteSummaryTtlMs(): number {
    return this.baseCacheTtlMs * YAHOO_QUOTE_SUMMARY_TTL_MULTIPLIER;
  }

  private newsTtlMs(): number {
    return this.baseCacheTtlMs * YAHOO_NEWS_TTL_MULTIPLIER;
  }

  private invalidSymbolError(providerSymbol: string): YahooFinanceApiError {
    return { isInvalidSymbol: true, message: `No Yahoo Finance data for "${providerSymbol}".` };
  }
}
