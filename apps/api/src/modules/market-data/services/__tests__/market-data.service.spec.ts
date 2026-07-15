import { MarketDataService } from "../market-data.service";
import { NotFoundError } from "@rmsm/shared";
import type { InstrumentRepository } from "../../repositories/instrument.repository";
import type { InstrumentAliasRepository } from "../../repositories/instrument-alias.repository";
import type { ExchangeRepository } from "../../repositories/exchange.repository";
import type { MarketCandleRepository } from "../../repositories/market-candle.repository";
import type { MarketQuoteRepository } from "../../repositories/market-quote.repository";
import type { MarketTickRepository } from "../../repositories/market-tick.repository";
import type { CorporateActionRepository } from "../../repositories/corporate-action.repository";

describe("MarketDataService", () => {
  function buildService(overrides: {
    instrumentRepository?: Partial<InstrumentRepository>;
    instrumentAliasRepository?: Partial<InstrumentAliasRepository>;
    exchangeRepository?: Partial<ExchangeRepository>;
    quoteRepository?: Partial<MarketQuoteRepository>;
  } = {}) {
    const instrumentRepository = { findById: jest.fn(), findByExchangeAndSymbol: jest.fn(), search: jest.fn(), count: jest.fn(), ...overrides.instrumentRepository } as unknown as InstrumentRepository;
    const instrumentAliasRepository = { findByProviderSymbol: jest.fn(), ...overrides.instrumentAliasRepository } as unknown as InstrumentAliasRepository;
    const exchangeRepository = { findById: jest.fn(), findByCode: jest.fn(), listActive: jest.fn(), ...overrides.exchangeRepository } as unknown as ExchangeRepository;
    const candleRepository = { findRangeCurrentValues: jest.fn() } as unknown as MarketCandleRepository;
    const quoteRepository = { findLatest: jest.fn(), findLatestForMany: jest.fn(), ...overrides.quoteRepository } as unknown as MarketQuoteRepository;
    const tickRepository = { findRange: jest.fn() } as unknown as MarketTickRepository;
    const corporateActionRepository = { findByInstrument: jest.fn() } as unknown as CorporateActionRepository;

    return new MarketDataService(instrumentRepository, instrumentAliasRepository, exchangeRepository, candleRepository, quoteRepository, tickRepository, corporateActionRepository);
  }

  it("getInstrument throws NotFoundError for a missing instrument", async () => {
    const service = buildService({ instrumentRepository: { findById: jest.fn().mockResolvedValue(null) } });
    await expect(service.getInstrument("missing")).rejects.toThrow(NotFoundError);
  });

  it("getInstrument returns the instrument when found", async () => {
    const instrument = { id: "inst1", symbol: "AAPL" };
    const service = buildService({ instrumentRepository: { findById: jest.fn().mockResolvedValue(instrument) } });
    await expect(service.getInstrument("inst1")).resolves.toBe(instrument);
  });

  it("resolveInstrumentByProviderSymbol throws NotFoundError when no alias exists", async () => {
    const service = buildService({ instrumentAliasRepository: { findByProviderSymbol: jest.fn().mockResolvedValue(null) } });
    await expect(service.resolveInstrumentByProviderSymbol("prov1", "AAPL")).rejects.toThrow(NotFoundError);
  });

  it("resolveInstrumentByProviderSymbol resolves through the alias to the instrument", async () => {
    const instrument = { id: "inst1" };
    const service = buildService({
      instrumentAliasRepository: { findByProviderSymbol: jest.fn().mockResolvedValue({ instrumentId: "inst1" }) },
      instrumentRepository: { findById: jest.fn().mockResolvedValue(instrument) },
    });
    await expect(service.resolveInstrumentByProviderSymbol("prov1", "AAPL")).resolves.toBe(instrument);
  });

  it("getLatestQuote throws NotFoundError when no quote exists", async () => {
    const service = buildService({ quoteRepository: { findLatest: jest.fn().mockResolvedValue(null) } });
    await expect(service.getLatestQuote("inst1")).rejects.toThrow(NotFoundError);
  });

  it("getExchange throws NotFoundError for a missing exchange", async () => {
    const service = buildService({ exchangeRepository: { findById: jest.fn().mockResolvedValue(null) } });
    await expect(service.getExchange("missing")).rejects.toThrow(NotFoundError);
  });

  it("getExchange returns the exchange when found", async () => {
    const exchange = { id: "ex1", code: "NASDAQ" };
    const service = buildService({ exchangeRepository: { findById: jest.fn().mockResolvedValue(exchange) } });
    await expect(service.getExchange("ex1")).resolves.toBe(exchange);
  });

  it("searchExchanges filters listActive() results by code or name, case-insensitively", async () => {
    const exchanges = [
      { id: "1", code: "NASDAQ", name: "Nasdaq Stock Market" },
      { id: "2", code: "NYSE", name: "New York Stock Exchange" },
    ];
    const service = buildService({ exchangeRepository: { listActive: jest.fn().mockResolvedValue(exchanges) } });

    const byCode = await service.searchExchanges("nasdaq");
    expect(byCode).toHaveLength(1);
    expect(byCode[0]?.code).toBe("NASDAQ");

    const byName = await service.searchExchanges("new york");
    expect(byName).toHaveLength(1);
    expect(byName[0]?.code).toBe("NYSE");
  });

  it("searchExchanges returns everything when the query is blank", async () => {
    const exchanges = [{ id: "1", code: "NASDAQ", name: "Nasdaq" }];
    const service = buildService({ exchangeRepository: { listActive: jest.fn().mockResolvedValue(exchanges) } });
    await expect(service.searchExchanges("   ")).resolves.toEqual(exchanges);
  });
});
