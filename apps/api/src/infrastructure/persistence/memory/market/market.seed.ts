import { Injectable, OnModuleInit } from "@nestjs/common";
import { Exchange, MarketSymbol, SymbolCode, CurrencyCode, TickSize, LotSize, Volume } from "@rmsm/market";
import { InMemoryExchangeRepository } from "./exchange.memory-repository";
import { InMemorySymbolRepository } from "./symbol.memory-repository";

/**
 * Seeds a small set of reference exchanges/symbols on app startup so
 * `GET /markets` and `GET /symbols` return real data out of the box,
 * rather than an empty list on every fresh boot. This is a Phase 4A
 * demonstration convenience, not a substitute for the real reference-data
 * import process a production deployment would run against the eventual
 * Prisma-backed repository (see PERSISTENCE_ROADMAP.md).
 */
@Injectable()
export class MarketSeedService implements OnModuleInit {
  constructor(
    private readonly exchangeRepository: InMemoryExchangeRepository,
    private readonly symbolRepository: InMemorySymbolRepository,
  ) {}

  async onModuleInit(): Promise<void> {
    const nyse = Exchange.create("nyse", {
      name: "New York Stock Exchange",
      country: "US",
      timezone: "America/New_York",
      type: "STOCK",
      tradingHours: [1, 2, 3, 4, 5].map((dayOfWeek) => ({ dayOfWeek: dayOfWeek as 1 | 2 | 3 | 4 | 5, openTime: "09:30", closeTime: "16:00" })),
      weekendDays: [0, 6],
    });
    await this.exchangeRepository.save(nyse);

    const forex = Exchange.create("forex", {
      name: "Global Forex Market",
      country: "GLOBAL",
      timezone: "UTC",
      type: "FOREX",
      tradingHours: [1, 2, 3, 4, 5].map((dayOfWeek) => ({ dayOfWeek: dayOfWeek as 1 | 2 | 3 | 4 | 5, openTime: "00:00", closeTime: "23:59" })),
      weekendDays: [0, 6],
    });
    await this.exchangeRepository.save(forex);

    await this.symbolRepository.save(this.buildSymbol(forex.id, "EURUSD", "Euro vs US Dollar", "EUR", "USD"));
    await this.symbolRepository.save(this.buildSymbol(forex.id, "GBPUSD", "British Pound vs US Dollar", "GBP", "USD"));
  }

  private buildSymbol(exchangeId: string, code: string, description: string, base: string, quote: string): MarketSymbol {
    const symbolCode = SymbolCode.create(code);
    const baseCurrency = CurrencyCode.create(base);
    const quoteCurrency = CurrencyCode.create(quote);
    const tickSize = TickSize.create(0.00001);
    const minVolume = Volume.create(0.01);
    const maxVolume = Volume.create(100);

    if (!symbolCode.ok || !baseCurrency.ok || !quoteCurrency.ok || !tickSize.ok || !minVolume.ok || !maxVolume.ok) {
      throw new Error(`MarketSeedService: failed to build seed symbol "${code}" — this is a hardcoded seed value and should never actually fail validation.`);
    }

    return MarketSymbol.create(`sym-${code.toLowerCase()}`, {
      code: symbolCode.value,
      description,
      baseCurrency: baseCurrency.value,
      quoteCurrency: quoteCurrency.value,
      tickSize: tickSize.value,
      pointValue: 10,
      lotSize: LotSize.standard(),
      contractSize: 100_000,
      minVolume: minVolume.value,
      maxVolume: maxVolume.value,
      precision: 5,
      exchangeId,
      assetClass: "FOREX",
      instrumentType: "SPOT",
    });
  }
}
