import { Injectable } from "@nestjs/common";
import type { CandleInterval } from "@rmsm/database";
import type { NormalizedCandle, NormalizedQuote, NormalizedSymbolSearchResult } from "../../interfaces/normalized-market-data.interface";
import type {
  YahooChartMeta,
  YahooChartResult,
  YahooQuoteSummaryResult,
  YahooSearchQuote,
  YahooSearchNewsItem,
  YahooRawValue,
  YahooIncomeStatementEntry,
  YahooBalanceSheetEntry,
  YahooCashFlowEntry,
  YahooFundProfile,
} from "./yahoo-finance.types";
import type {
  YahooCompanyProfileDto,
  YahooDividendDto,
  YahooDividendSummaryDto,
  YahooSplitDto,
  YahooEarningsDto,
  YahooFinancialStatementLineDto,
  YahooEtfMetadataDto,
  YahooNewsItemDto,
} from "./yahoo-finance.dto";

/**
 * Raw Yahoo Finance JSON → this module's Normalized* contracts (+ the
 * additive DTOs in yahoo-finance.dto.ts) — the only place Yahoo's raw
 * response shapes are read anywhere in this system, matching every
 * mapper in this module since MD-001. Pure, dependency-free.
 */
@Injectable()
export class YahooFinanceMapper {
  toNormalizedQuote(meta: YahooChartMeta): NormalizedQuote {
    return {
      providerSymbol: meta.symbol,
      lastPrice: this.numberToString(meta.regularMarketPrice),
      eventTime: meta.regularMarketTime ? new Date(meta.regularMarketTime * 1000) : new Date(),
    };
  }

  toNormalizedCandles(result: YahooChartResult, providerSymbol: string, interval: CandleInterval): NormalizedCandle[] {
    const timestamps = result.timestamp ?? [];
    const quote = result.indicators?.quote?.[0];
    if (!quote) return [];

    const candles: NormalizedCandle[] = [];
    for (let i = 0; i < timestamps.length; i++) {
      const open = quote.open?.[i];
      const high = quote.high?.[i];
      const low = quote.low?.[i];
      const close = quote.close?.[i];
      const volume = quote.volume?.[i];
      // Yahoo pads non-trading days with `null` entries in every array —
      // skipped rather than mapped as a zero-valued candle, which would
      // misrepresent a day with no trading as a real (and wrong) OHLCV bar.
      if (open == null || high == null || low == null || close == null) continue;

      candles.push({
        providerSymbol,
        interval,
        eventTime: new Date(timestamps[i] * 1000),
        open: String(open),
        high: String(high),
        low: String(low),
        close: String(close),
        volume: volume == null ? "0" : String(volume),
      });
    }
    return candles;
  }

  toNormalizedSymbolSearchResults(quotes: YahooSearchQuote[]): NormalizedSymbolSearchResult[] {
    return quotes.map((q) => ({
      providerSymbol: q.symbol,
      name: q.longname ?? q.shortname ?? q.symbol,
      assetClass: this.toAssetClass(q.quoteType),
      exchangeCode: q.exchange,
    }));
  }

  toCompanyProfile(symbol: string, result: YahooQuoteSummaryResult): YahooCompanyProfileDto {
    const profile = result.assetProfile;
    const price = result.price;
    const summary = result.summaryDetail;
    return {
      symbol,
      companyName: price?.longName ?? price?.shortName,
      exchange: price?.exchangeName,
      currency: price?.currency ?? summary?.currency,
      country: profile?.country,
      sector: profile?.sector,
      industry: profile?.industry,
      employeeCount: profile?.fullTimeEmployees,
      website: profile?.website,
      businessSummary: profile?.longBusinessSummary,
      marketCapitalization: this.readRaw(price?.marketCap ?? summary?.marketCap),
    };
  }

  /** Dividend history comes from the chart endpoint's `events.dividends` (requires `getChart(..., { includeEvents: true })`); yield/ex-date come from quoteSummary's `summaryDetail` — two different Yahoo endpoints, combined here into one DTO since MD-004 groups them under one "Dividends" feature. Either input may be omitted by the caller (e.g. a quoteSummary-only or chart-only fetch) without this method failing. */
  toDividendSummary(chartResult: YahooChartResult | undefined, summaryDetail: YahooQuoteSummaryResult["summaryDetail"] | undefined): YahooDividendSummaryDto {
    const history: YahooDividendDto[] = Object.values(chartResult?.events?.dividends ?? {}).map((d) => ({
      exDividendDate: new Date(d.date * 1000),
      amount: d.amount,
    }));
    return {
      history,
      dividendYield: this.readRaw(summaryDetail?.dividendYield),
      exDividendDate: this.readRawTimestamp(summaryDetail?.exDividendDate),
    };
  }

  toSplits(chartResult: YahooChartResult | undefined): YahooSplitDto[] {
    return Object.values(chartResult?.events?.splits ?? {}).map((s) => ({
      date: new Date(s.date * 1000),
      numerator: s.numerator,
      denominator: s.denominator,
      ratio: s.splitRatio,
    }));
  }

  toEarnings(result: YahooQuoteSummaryResult): YahooEarningsDto {
    const nextDate = result.calendarEvents?.earnings?.earningsDate?.[0];
    const latestQuarter = result.earnings?.earningsChart?.quarterly?.at(-1);
    return {
      earningsDate: this.readRawTimestamp(nextDate),
      eps: latestQuarter ? { actual: this.readRaw(latestQuarter.actual), estimate: this.readRaw(latestQuarter.estimate) } : undefined,
      revenue: undefined,
    };
  }

  toIncomeStatement(entries: YahooIncomeStatementEntry[] = []): YahooFinancialStatementLineDto[] {
    return entries.map((entry) => ({
      endDate: this.readRawTimestamp(entry.endDate),
      values: {
        totalRevenue: this.readRaw(entry.totalRevenue),
        costOfRevenue: this.readRaw(entry.costOfRevenue),
        grossProfit: this.readRaw(entry.grossProfit),
        operatingIncome: this.readRaw(entry.operatingIncome),
        netIncome: this.readRaw(entry.netIncome),
      },
    }));
  }

  toBalanceSheet(entries: YahooBalanceSheetEntry[] = []): YahooFinancialStatementLineDto[] {
    return entries.map((entry) => ({
      endDate: this.readRawTimestamp(entry.endDate),
      values: {
        totalAssets: this.readRaw(entry.totalAssets),
        totalLiabilities: this.readRaw(entry.totalLiab),
        totalStockholderEquity: this.readRaw(entry.totalStockholderEquity),
        cash: this.readRaw(entry.cash),
      },
    }));
  }

  toCashFlowStatement(entries: YahooCashFlowEntry[] = []): YahooFinancialStatementLineDto[] {
    return entries.map((entry) => ({
      endDate: this.readRawTimestamp(entry.endDate),
      values: {
        operatingCashFlow: this.readRaw(entry.totalCashFromOperatingActivities),
        capitalExpenditures: this.readRaw(entry.capitalExpenditures),
        freeCashFlow: this.readRaw(entry.freeCashFlow),
      },
    }));
  }

  /** Yahoo's `fundProfile` module carries both ETF and mutual fund metadata under one shape — see `YahooMutualFundMetadataDto`'s own doc comment. */
  toFundMetadata(fundProfile: YahooFundProfile | undefined): YahooEtfMetadataDto {
    return {
      fundFamily: fundProfile?.family,
      category: fundProfile?.categoryName,
      totalNetAssets: this.readRaw(fundProfile?.totalNetAssets),
      expenseRatio: this.readRaw(fundProfile?.feesExpensesInvestment?.annualReportExpenseRatio),
    };
  }

  toNews(items: YahooSearchNewsItem[]): YahooNewsItemDto[] {
    return items.map((item) => ({
      headline: item.title,
      publisher: item.publisher,
      publishedAt: item.providerPublishTime ? new Date(item.providerPublishTime * 1000) : undefined,
      url: item.link,
    }));
  }

  private readRaw(value: YahooRawValue | undefined): number | undefined {
    return value?.raw;
  }

  private readRawTimestamp(value: YahooRawValue | undefined): Date | undefined {
    return value?.raw ? new Date(value.raw * 1000) : undefined;
  }

  private numberToString(value: number | undefined): string | undefined {
    return value === undefined ? undefined : String(value);
  }

  /** MD-004 positions Yahoo as a company-data provider, not a quote source, so `symbolSearchClient` classification only needs to distinguish the two `AssetClass` values Yahoo search realistically returns for this provider's use case — see `YAHOO_ASSET_CLASSES`'s own doc comment for the mutual-fund caveat. */
  private toAssetClass(quoteType: string | undefined): NormalizedSymbolSearchResult["assetClass"] {
    const normalized = (quoteType ?? "").toUpperCase();
    if (normalized === "ETF") return "ETF";
    return "EQUITY";
  }
}
