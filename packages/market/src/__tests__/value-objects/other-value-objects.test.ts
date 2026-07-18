import { describe, expect, it } from "vitest";
import { Volume } from "../../value-objects/volume";
import { SymbolCode } from "../../value-objects/symbol-code";
import { CurrencyCode } from "../../value-objects/currency";
import { Pip } from "../../value-objects/pip";
import { TickSize } from "../../value-objects/tick-size";
import { LotSize } from "../../value-objects/lot-size";
import { Spread } from "../../value-objects/spread";
import { Price } from "../../value-objects/price";

describe("Volume", () => {
  it("accepts zero and positive values", () => {
    expect(Volume.create(0).ok).toBe(true);
    expect(Volume.create(100).ok).toBe(true);
  });
  it("rejects negative values", () => {
    expect(Volume.create(-1).ok).toBe(false);
  });
  it("zero() is a zero volume and isZero() reports it", () => {
    expect(Volume.zero().isZero()).toBe(true);
  });
  it("add() sums units", () => {
    const a = Volume.create(10);
    const b = Volume.create(5);
    expect(a.ok && b.ok && a.value.add(b.value).units).toBe(15);
  });
  it("isWithin() checks an inclusive range", () => {
    const v = Volume.create(5);
    const min = Volume.create(1);
    const max = Volume.create(10);
    expect(v.ok && min.ok && max.ok && v.value.isWithin(min.value, max.value)).toBe(true);
  });
});

describe("SymbolCode", () => {
  it("accepts and normalizes a valid code to uppercase", () => {
    const result = SymbolCode.create("eurusd");
    expect(result.ok && result.value.value).toBe("EURUSD");
  });
  it("rejects an empty string", () => {
    expect(SymbolCode.create("   ").ok).toBe(false);
  });
  it("rejects a code with invalid characters", () => {
    expect(SymbolCode.create("EUR/USD!").ok).toBe(false);
  });
  it("accepts codes with allowed punctuation", () => {
    expect(SymbolCode.create("ES.FUT-2026").ok).toBe(true);
  });
});

describe("CurrencyCode", () => {
  it("accepts a known currency, case-insensitively", () => {
    const result = CurrencyCode.create("usd");
    expect(result.ok && result.value.value).toBe("USD");
  });
  it("rejects an unknown currency", () => {
    expect(CurrencyCode.create("XYZ").ok).toBe(false);
  });
});

describe("Pip", () => {
  it("standard() is 0.0001 and jpy() is 0.01", () => {
    expect(Pip.standard().size).toBe(0.0001);
    expect(Pip.jpy().size).toBe(0.01);
  });
  it("rejects a non-positive size", () => {
    expect(Pip.create(0).ok).toBe(false);
    expect(Pip.create(-0.0001).ok).toBe(false);
  });
  it("toPips converts a raw difference into a pip count", () => {
    expect(Pip.standard().toPips(0.0025)).toBeCloseTo(25);
  });
});

describe("TickSize", () => {
  it("rejects zero and negative values", () => {
    expect(TickSize.create(0).ok).toBe(false);
    expect(TickSize.create(-1).ok).toBe(false);
  });
  it("roundToTick rounds to the nearest valid tick", () => {
    const result = TickSize.create(0.25);
    expect(result.ok && result.value.roundToTick(100.1)).toBe(100.0);
  });
});

describe("LotSize", () => {
  it("standard/mini/micro produce the expected unit counts", () => {
    expect(LotSize.standard().units).toBe(100_000);
    expect(LotSize.mini().units).toBe(10_000);
    expect(LotSize.micro().units).toBe(1_000);
  });
  it("toUnits multiplies lots by the lot's own unit size", () => {
    expect(LotSize.standard().toUnits(2.5)).toBe(250_000);
  });
  it("rejects a non-positive value", () => {
    expect(LotSize.create(0).ok).toBe(false);
  });
});

describe("Spread", () => {
  it("computes the difference between ask and bid", () => {
    const bid = Price.create(1.1, 4);
    const ask = Price.create(1.1002, 4);
    expect(bid.ok && ask.ok).toBe(true);
    if (bid.ok && ask.ok) {
      const spread = Spread.fromBidAsk(bid.value, ask.value);
      expect(spread.ok && spread.value.value).toBeCloseTo(0.0002);
    }
  });

  it("rejects a crossed market (ask < bid)", () => {
    const bid = Price.create(1.1002, 4);
    const ask = Price.create(1.1, 4);
    expect(bid.ok && ask.ok).toBe(true);
    if (bid.ok && ask.ok) {
      expect(Spread.fromBidAsk(bid.value, ask.value).ok).toBe(false);
    }
  });

  it("accepts a zero spread", () => {
    const price = Price.create(1.1, 4);
    expect(price.ok).toBe(true);
    if (price.ok) {
      expect(Spread.fromBidAsk(price.value, price.value).ok).toBe(true);
    }
  });

  it("rejects mismatched precisions", () => {
    const bid = Price.create(1.1, 2);
    const ask = Price.create(1.1, 4);
    expect(bid.ok && ask.ok).toBe(true);
    if (bid.ok && ask.ok) {
      expect(Spread.fromBidAsk(bid.value, ask.value).ok).toBe(false);
    }
  });

  it("toPips converts the spread using the given pip size", () => {
    const bid = Price.create(1.1, 4);
    const ask = Price.create(1.1002, 4);
    expect(bid.ok && ask.ok).toBe(true);
    if (bid.ok && ask.ok) {
      const spread = Spread.fromBidAsk(bid.value, ask.value);
      expect(spread.ok && spread.value.toPips(Pip.standard())).toBeCloseTo(2);
    }
  });
});
