import { MarketDataService } from "../market-data.service";
import { NotFoundError } from "@rmsm/shared";
import type { InstrumentRepository } from "../../repositories/instrument.repository";
import type { InstrumentAliasRepository } from "../../repositories/instrument-alias.repository";
import type { MarketCandleRepository } from "../../repositories/market-candle.repository";
import type { MarketQuoteRepository } from "../../repositories/market-quote.repository";
import type { CorporateActionRepository } from "../../repositories/corporate-action.repository";

describe("MarketDataService", () => {
  function buildService(overrides: {
    instrumentRepository?: Partial<InstrumentRepository>;
    instrumentAliasRepository?: Partial<InstrumentAliasRepository>;
    quoteRepository?: Partial<MarketQuoteRepository>;
  } = {}) {
    const instrumentRepository = { findById: jest.fn(), findByExchangeAndSymbol: jest.fn(), search: jest.fn(), ...overrides.instrumentRepository } as unknown as InstrumentRepository;
    const instrumentAliasRepository = { findByProviderSymbol: jest.fn(), ...overrides.instrumentAliasRepository } as unknown as InstrumentAliasRepository;
    const candleRepository = { findRangeCurrentValues: jest.fn() } as unknown as MarketCandleRepository;
    const quoteRepository = { findLatest: jest.fn(), findLatestForMany: jest.fn(), ...overrides.quoteRepository } as unknown as MarketQuoteRepository;
    const corporateActionRepository = { findByInstrument: jest.fn() } as unknown as CorporateActionRepository;

    return new MarketDataService(instrumentRepository, instrumentAliasRepository, candleRepository, quoteRepository, corporateActionRepository);
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
});
