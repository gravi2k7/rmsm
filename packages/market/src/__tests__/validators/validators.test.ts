import { describe, expect, it } from "vitest";
import { validateDistinctCurrencies, validateVolumeRange } from "../../validators/symbol.validator";
import { validateBidAsk } from "../../validators/price.validator";
import { CurrencyCode } from "../../value-objects/currency";
import { Volume } from "../../value-objects/volume";
import { Price } from "../../value-objects/price";

describe("validateDistinctCurrencies", () => {
  it("accepts two different currencies", () => {
    const eur = CurrencyCode.create("EUR");
    const usd = CurrencyCode.create("USD");
    expect(eur.ok && usd.ok).toBe(true);
    if (eur.ok && usd.ok) {
      expect(validateDistinctCurrencies(eur.value, usd.value).ok).toBe(true);
    }
  });

  it("rejects identical base and quote currencies", () => {
    const usd = CurrencyCode.create("USD");
    expect(usd.ok).toBe(true);
    if (usd.ok) {
      expect(validateDistinctCurrencies(usd.value, usd.value).ok).toBe(false);
    }
  });
});

describe("validateVolumeRange", () => {
  it("accepts min <= max", () => {
    const min = Volume.create(1);
    const max = Volume.create(10);
    expect(min.ok && max.ok).toBe(true);
    if (min.ok && max.ok) {
      expect(validateVolumeRange(min.value, max.value).ok).toBe(true);
    }
  });

  it("rejects min > max", () => {
    const min = Volume.create(10);
    const max = Volume.create(1);
    expect(min.ok && max.ok).toBe(true);
    if (min.ok && max.ok) {
      expect(validateVolumeRange(min.value, max.value).ok).toBe(false);
    }
  });
});

describe("validateBidAsk", () => {
  it("accepts a normal, non-crossed bid/ask pair", () => {
    const bid = Price.create(1.1, 4);
    const ask = Price.create(1.1002, 4);
    expect(bid.ok && ask.ok).toBe(true);
    if (bid.ok && ask.ok) {
      expect(validateBidAsk(bid.value, ask.value).ok).toBe(true);
    }
  });

  it("rejects a crossed market", () => {
    const bid = Price.create(1.1002, 4);
    const ask = Price.create(1.1, 4);
    expect(bid.ok && ask.ok).toBe(true);
    if (bid.ok && ask.ok) {
      expect(validateBidAsk(bid.value, ask.value).ok).toBe(false);
    }
  });

  it("rejects mismatched precisions", () => {
    const bid = Price.create(1.1, 2);
    const ask = Price.create(1.1, 4);
    expect(bid.ok && ask.ok).toBe(true);
    if (bid.ok && ask.ok) {
      expect(validateBidAsk(bid.value, ask.value).ok).toBe(false);
    }
  });
});
