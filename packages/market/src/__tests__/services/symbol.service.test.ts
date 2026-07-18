import { describe, expect, it } from "vitest";
import { SymbolService } from "../../services/symbol.service";
import { SymbolCode } from "../../value-objects/symbol-code";
import { Volume } from "../../value-objects/volume";
import { MarketSymbol } from "../../entities/symbol";
import { CurrencyCode } from "../../value-objects/currency";
import { TickSize } from "../../value-objects/tick-size";
import { LotSize } from "../../value-objects/lot-size";
import type { SymbolRepository } from "../../repositories/symbol.repository";

function code() {
  const r = SymbolCode.create("EURUSD");
  if (!r.ok) throw new Error("fixture failed");
  return r.value;
}

function buildTestSymbol(): MarketSymbol {
  const base = CurrencyCode.create("EUR");
  const quote = CurrencyCode.create("USD");
  const tickSize = TickSize.create(0.00001);
  const min = Volume.create(0.01);
  const max = Volume.create(100);
  if (!base.ok || !quote.ok || !tickSize.ok || !min.ok || !max.ok) throw new Error("fixture failed");

  return MarketSymbol.create("sym-1", {
    code: code(),
    description: "EUR/USD",
    baseCurrency: base.value,
    quoteCurrency: quote.value,
    tickSize: tickSize.value,
    pointValue: 10,
    lotSize: LotSize.standard(),
    contractSize: 100_000,
    minVolume: min.value,
    maxVolume: max.value,
    precision: 5,
    exchangeId: "ex-1",
    assetClass: "FOREX",
    instrumentType: "SPOT",
  });
}

function fakeRepo(symbol: MarketSymbol | null): SymbolRepository {
  return {
    findByCode: async () => symbol,
    findByAssetClass: async () => [],
    findByExchange: async () => [],
    save: async () => undefined,
    findInstrumentsBySymbol: async () => [],
    saveInstrument: async () => undefined,
  };
}

describe("SymbolService.getByCode", () => {
  it("returns the symbol when found", async () => {
    const service = new SymbolService(fakeRepo(buildTestSymbol()));
    const result = await service.getByCode(code());
    expect(result.ok).toBe(true);
  });

  it("returns UnknownSymbolError when not found", async () => {
    const service = new SymbolService(fakeRepo(null));
    const result = await service.getByCode(code());
    expect(result.ok).toBe(false);
  });
});

describe("SymbolService.validateVolume", () => {
  it("accepts a volume within the symbol's own bounds", async () => {
    const service = new SymbolService(fakeRepo(buildTestSymbol()));
    const volume = Volume.create(1);
    if (!volume.ok) throw new Error("fixture failed");
    const result = await service.validateVolume(code(), volume.value);
    expect(result.ok).toBe(true);
  });

  it("rejects a volume outside the symbol's own bounds", async () => {
    const service = new SymbolService(fakeRepo(buildTestSymbol()));
    const volume = Volume.create(1000);
    if (!volume.ok) throw new Error("fixture failed");
    const result = await service.validateVolume(code(), volume.value);
    expect(result.ok).toBe(false);
  });

  it("propagates UnknownSymbolError when the symbol doesn't exist", async () => {
    const service = new SymbolService(fakeRepo(null));
    const volume = Volume.create(1);
    if (!volume.ok) throw new Error("fixture failed");
    const result = await service.validateVolume(code(), volume.value);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.code).toBe("UNKNOWN_SYMBOL");
  });
});
