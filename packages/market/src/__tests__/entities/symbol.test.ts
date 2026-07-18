import { describe, expect, it } from "vitest";
import { MarketSymbol } from "../../entities/symbol";
import { SymbolCode } from "../../value-objects/symbol-code";
import { CurrencyCode } from "../../value-objects/currency";
import { TickSize } from "../../value-objects/tick-size";
import { LotSize } from "../../value-objects/lot-size";
import { Volume } from "../../value-objects/volume";

function buildSymbol() {
  const code = SymbolCode.create("EURUSD");
  const base = CurrencyCode.create("EUR");
  const quote = CurrencyCode.create("USD");
  const tickSize = TickSize.create(0.00001);
  const lotSize = LotSize.standard();
  const minVolume = Volume.create(0.01);
  const maxVolume = Volume.create(100);

  if (!code.ok || !base.ok || !quote.ok || !tickSize.ok || !minVolume.ok || !maxVolume.ok) {
    throw new Error("test fixture construction failed");
  }

  return MarketSymbol.create("sym-1", {
    code: code.value,
    description: "Euro vs US Dollar",
    baseCurrency: base.value,
    quoteCurrency: quote.value,
    tickSize: tickSize.value,
    pointValue: 10,
    lotSize,
    contractSize: 100_000,
    minVolume: minVolume.value,
    maxVolume: maxVolume.value,
    precision: 5,
    exchangeId: "ex-forex",
    assetClass: "FOREX",
    instrumentType: "SPOT",
  });
}

describe("MarketSymbol.create", () => {
  it("builds a symbol with the given properties", () => {
    const symbol = buildSymbol();
    expect(symbol.code.value).toBe("EURUSD");
    expect(symbol.assetClass).toBe("FOREX");
  });

  it("rejects minVolume greater than maxVolume", () => {
    const code = SymbolCode.create("EURUSD");
    const base = CurrencyCode.create("EUR");
    const quote = CurrencyCode.create("USD");
    const tickSize = TickSize.create(0.00001);
    const min = Volume.create(100);
    const max = Volume.create(1);
    if (!code.ok || !base.ok || !quote.ok || !tickSize.ok || !min.ok || !max.ok) throw new Error("fixture failed");

    expect(() =>
      MarketSymbol.create("sym-2", {
        code: code.value,
        description: "x",
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
      }),
    ).toThrow();
  });

  it("rejects a precision outside 0-10", () => {
    const code = SymbolCode.create("EURUSD");
    const base = CurrencyCode.create("EUR");
    const quote = CurrencyCode.create("USD");
    const tickSize = TickSize.create(0.00001);
    const vol = Volume.create(1);
    if (!code.ok || !base.ok || !quote.ok || !tickSize.ok || !vol.ok) throw new Error("fixture failed");

    expect(() =>
      MarketSymbol.create("sym-3", {
        code: code.value,
        description: "x",
        baseCurrency: base.value,
        quoteCurrency: quote.value,
        tickSize: tickSize.value,
        pointValue: 10,
        lotSize: LotSize.standard(),
        contractSize: 100_000,
        minVolume: vol.value,
        maxVolume: vol.value,
        precision: 20,
        exchangeId: "ex-1",
        assetClass: "FOREX",
        instrumentType: "SPOT",
      }),
    ).toThrow();
  });
});

describe("MarketSymbol.isVolumeAllowed", () => {
  it("accepts a volume within bounds", () => {
    const symbol = buildSymbol();
    const volume = Volume.create(1);
    expect(volume.ok && symbol.isVolumeAllowed(volume.value)).toBe(true);
  });

  it("rejects a volume outside bounds", () => {
    const symbol = buildSymbol();
    const volume = Volume.create(1000);
    expect(volume.ok && symbol.isVolumeAllowed(volume.value)).toBe(false);
  });
});
