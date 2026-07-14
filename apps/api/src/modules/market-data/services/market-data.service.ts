import { Injectable } from "@nestjs/common";
import { NotFoundError } from "@rmsm/shared";
import type { AssetClass, CandleInterval, InstrumentStatus } from "@rmsm/database";
import { InstrumentRepository, InstrumentListFilters, PageParams } from "../repositories/instrument.repository";
import { InstrumentAliasRepository } from "../repositories/instrument-alias.repository";
import { MarketCandleRepository, CandleRangeQuery } from "../repositories/market-candle.repository";
import { MarketQuoteRepository } from "../repositories/market-quote.repository";
import { CorporateActionRepository } from "../repositories/corporate-action.repository";
import type { InstrumentModel } from "../interfaces/models/reference-data.models";
import type { MarketCandleModel, MarketQuoteModel, CorporateActionModel } from "../interfaces/models/time-series.models";

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
 */
@Injectable()
export class MarketDataService {
  constructor(
    private readonly instrumentRepository: InstrumentRepository,
    private readonly instrumentAliasRepository: InstrumentAliasRepository,
    private readonly candleRepository: MarketCandleRepository,
    private readonly quoteRepository: MarketQuoteRepository,
    private readonly corporateActionRepository: CorporateActionRepository,
  ) {}

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

  getCorporateActions(instrumentId: string): Promise<CorporateActionModel[]> {
    return this.corporateActionRepository.findByInstrument(instrumentId);
  }
}
