import { Injectable } from "@nestjs/common";
import { NotFoundError } from "@rmsm/shared";
import type { AssetClass, CandleInterval, InstrumentStatus } from "@rmsm/database";
import { InstrumentRepository, InstrumentListFilters, PageParams } from "../repositories/instrument.repository";
import { InstrumentAliasRepository } from "../repositories/instrument-alias.repository";
import { ExchangeRepository } from "../repositories/exchange.repository";
import { MarketCandleRepository, CandleRangeQuery } from "../repositories/market-candle.repository";
import { MarketQuoteRepository } from "../repositories/market-quote.repository";
import { MarketTickRepository } from "../repositories/market-tick.repository";
import { CorporateActionRepository } from "../repositories/corporate-action.repository";
import type { InstrumentModel, ExchangeModel } from "../interfaces/models/reference-data.models";
import type { MarketCandleModel, MarketQuoteModel, MarketTickModel, CorporateActionModel } from "../interfaces/models/time-series.models";

/**
 * The read-side API every future AI-10x engine actually consumes — the
 * concrete implementation of the "AI-101 is the single source of truth,
 * no future module touches a provider or the database directly"
 * architecture rule (Phase 1, reaffirmed in every phase since). Every
 * method here wraps repository calls only; this service has no provider
 * dependency at all, since reading already-persisted data never needs
 * one — provider orchestration belongs to `HistoricalImportService`/
 * `SynchronizationService`, the write-side services that actually
 * populate what this service reads.
 *
 * The `getExchange*`/`listExchanges`/`searchExchanges`/`getTicks`
 * methods below are new this phase (Phase 4) — Phase 4's own scope
 * explicitly excludes "new business logic," but Phase 4's own
 * architecture rule is equally explicit that controllers may never
 * reach a repository directly ("Everything flows through the AI-101
 * service layer"). Before this addition, MarketDataService had zero
 * exchange- or tick-related methods at all — without adding them, an
 * Exchange or Tick controller would have had no legal path to their
 * repositories. These are thin pass-throughs (no new decisions, no new
 * orchestration), the plumbing the "no bypassing layers" rule requires,
 * not the substantive business logic Phase 3 was about.
 */
@Injectable()
export class MarketDataService {
  constructor(
    private readonly instrumentRepository: InstrumentRepository,
    private readonly instrumentAliasRepository: InstrumentAliasRepository,
    private readonly exchangeRepository: ExchangeRepository,
    private readonly candleRepository: MarketCandleRepository,
    private readonly quoteRepository: MarketQuoteRepository,
    private readonly tickRepository: MarketTickRepository,
    private readonly corporateActionRepository: CorporateActionRepository,
  ) {}

  async getExchange(id: string): Promise<ExchangeModel> {
    const exchange = await this.exchangeRepository.findById(id);
    if (!exchange) throw new NotFoundError("Exchange", id);
    return exchange;
  }

  async getExchangeByCode(code: string): Promise<ExchangeModel> {
    const exchange = await this.exchangeRepository.findByCode(code);
    if (!exchange) throw new NotFoundError("Exchange", code);
    return exchange;
  }

  listExchanges(): Promise<ExchangeModel[]> {
    return this.exchangeRepository.listActive();
  }

  /**
   * In-memory filtering over `listActive()` — `ExchangeRepository` has no
   * search/filter method (Phase 2A never built one; there was no
   * endpoint needing it until now), and Phase 4 explicitly forbids
   * repository changes. Honest for a small reference table (there will
   * never be more than a few hundred exchanges), but a real, named
   * scaling limitation if this table ever grows unexpectedly large —
   * flagged rather than silently presented as equivalent to a real
   * database-level search.
   */
  async searchExchanges(query: string): Promise<ExchangeModel[]> {
    const all = await this.exchangeRepository.listActive();
    const needle = query.trim().toLowerCase();
    if (!needle) return all;
    return all.filter((e) => e.code.toLowerCase().includes(needle) || e.name.toLowerCase().includes(needle));
  }

  async getInstrument(id: string): Promise<InstrumentModel> {
    const instrument = await this.instrumentRepository.findById(id);
    if (!instrument) throw new NotFoundError("Instrument", id);
    return instrument;
  }

  async getInstrumentByExchangeAndSymbol(exchangeId: string, symbol: string): Promise<InstrumentModel> {
    const instrument = await this.instrumentRepository.findByExchangeAndSymbol(exchangeId, symbol);
    if (!instrument) throw new NotFoundError("Instrument", `${exchangeId}/${symbol}`);
    return instrument;
  }

  /** Resolves a provider's own symbol string to the canonical Instrument it maps to — the read-side use of InstrumentAlias (Phase 2A), the mechanism that lets this system never need to guess-split a concatenated provider symbol (ADR-028). */
  async resolveInstrumentByProviderSymbol(providerId: string, providerSymbol: string): Promise<InstrumentModel> {
    const alias = await this.instrumentAliasRepository.findByProviderSymbol(providerId, providerSymbol);
    if (!alias) throw new NotFoundError("InstrumentAlias", `${providerId}/${providerSymbol}`);
    return this.getInstrument(alias.instrumentId);
  }

  searchInstruments(
    filters: { assetClass?: AssetClass; status?: InstrumentStatus; search?: string },
    page: PageParams,
  ): Promise<InstrumentModel[]> {
    const repoFilters: InstrumentListFilters = filters;
    return this.instrumentRepository.search(repoFilters, page);
  }

  countInstruments(filters: { assetClass?: AssetClass; status?: InstrumentStatus }): Promise<number> {
    return this.instrumentRepository.count(filters);
  }

  /** The current-value read path — excludes superseded correction rows (ADR-022), so callers never see stale data by accident. */
  getCandles(instrumentId: string, interval: CandleInterval, from: Date, to: Date, limit = 1000): Promise<MarketCandleModel[]> {
    const query: CandleRangeQuery = { instrumentId, interval, from, to, limit };
    return this.candleRepository.findRangeCurrentValues(query);
  }

  async getLatestQuote(instrumentId: string): Promise<MarketQuoteModel> {
    const quote = await this.quoteRepository.findLatest(instrumentId);
    if (!quote) throw new NotFoundError("MarketQuote", instrumentId);
    return quote;
  }

  getLatestQuotes(instrumentIds: string[]): Promise<MarketQuoteModel[]> {
    return this.quoteRepository.findLatestForMany(instrumentIds);
  }

  getTicks(instrumentId: string, from: Date, to: Date, limit = 500): Promise<MarketTickModel[]> {
    return this.tickRepository.findRange(instrumentId, from, to, limit);
  }

  getCorporateActions(instrumentId: string): Promise<CorporateActionModel[]> {
    return this.corporateActionRepository.findByInstrument(instrumentId);
  }
}
