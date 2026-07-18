import { describe, expect, it } from "vitest";
import { SymbolFactory, type RawSymbolInput } from "../../factories/symbol.factory";

function validInput(): RawSymbolInput {
  return {
    id: "sym-1",
    code: "eurusd",
    description: "Euro vs US Dollar",
    baseCurrency: "eur",
    quoteCurrency: "usd",
    tickSize: 0.00001,
    pointValue: 10,
    lotSizeUnits: 100_000,
    contractSize: 100_000,
    minVolume: 0.01,
    maxVolume: 100,
    precision: 5,
    exchangeId: "ex-forex",
    assetClass: "FOREX",
    instrumentType: "SPOT",
  };
}

describe("SymbolFactory.create", () => {
  it("builds a valid MarketSymbol from valid raw input", () => {
    const result = SymbolFactory.create(validInput());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.code.value).toBe("EURUSD");
      expect(result.value.baseCurrency.value).toBe("EUR");
    }
  });

  it("fails fast on an invalid symbol code before checking anything else", () => {
    const result = SymbolFactory.create({ ...validInput(), code: "!!!" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("INVALID_SYMBOL_CODE");
  });

  it("fails on an unknown base currency", () => {
    const result = SymbolFactory.create({ ...validInput(), baseCurrency: "ZZZ" });
    expect(result.ok).toBe(false);
  });

  it("fails when base and quote currency are the same", () => {
    const result = SymbolFactory.create({ ...validInput(), quoteCurrency: "eur" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("CURRENCY_MISMATCH");
  });

  it("fails on an invalid tick size", () => {
    const result = SymbolFactory.create({ ...validInput(), tickSize: -1 });
    expect(result.ok).toBe(false);
  });

  it("fails on minVolume greater than maxVolume", () => {
    const result = SymbolFactory.create({ ...validInput(), minVolume: 100, maxVolume: 1 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("INVALID_VOLUME");
  });
});
