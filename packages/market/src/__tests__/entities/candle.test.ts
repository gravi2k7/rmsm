import { describe, expect, it } from "vitest";
import { Candle } from "../../entities/candle";
import { SymbolCode } from "../../value-objects/symbol-code";
import { Price } from "../../value-objects/price";
import { Volume } from "../../value-objects/volume";
import { Timeframe } from "../../enums/timeframe.enum";

function price(amount: number) {
  const result = Price.create(amount, 5);
  if (!result.ok) throw new Error("fixture failed");
  return result.value;
}

function symbolCode() {
  const result = SymbolCode.create("EURUSD");
  if (!result.ok) throw new Error("fixture failed");
  return result.value;
}

describe("Candle.open", () => {
  it("seeds open/high/low/close all equal to the opening price", () => {
    const candle = Candle.open("c1", symbolCode(), Timeframe.M5, new Date(), price(1.1));
    expect(candle.open.equals(price(1.1))).toBe(true);
    expect(candle.high.equals(price(1.1))).toBe(true);
    expect(candle.low.equals(price(1.1))).toBe(true);
    expect(candle.close.equals(price(1.1))).toBe(true);
  });

  it("starts with zero volume and is not complete", () => {
    const candle = Candle.open("c1", symbolCode(), Timeframe.M5, new Date(), price(1.1));
    expect(candle.volume.isZero()).toBe(true);
    expect(candle.isComplete).toBe(false);
  });

  it("raises CandleOpenedEvent", () => {
    const candle = Candle.open("c1", symbolCode(), Timeframe.M5, new Date(), price(1.1));
    const events = candle.pullDomainEvents();
    expect(events[0]?.kind).toBe("CandleOpened");
  });
});

describe("Candle.updateWithTick", () => {
  it("extends high on a new high tick", () => {
    const candle = Candle.open("c1", symbolCode(), Timeframe.M5, new Date(), price(1.1));
    candle.updateWithTick(price(1.2), Volume.zero());
    expect(candle.high.equals(price(1.2))).toBe(true);
  });

  it("extends low on a new low tick", () => {
    const candle = Candle.open("c1", symbolCode(), Timeframe.M5, new Date(), price(1.1));
    candle.updateWithTick(price(1.0), Volume.zero());
    expect(candle.low.equals(price(1.0))).toBe(true);
  });

  it("always updates close to the latest tick price", () => {
    const candle = Candle.open("c1", symbolCode(), Timeframe.M5, new Date(), price(1.1));
    candle.updateWithTick(price(1.15), Volume.zero());
    expect(candle.close.equals(price(1.15))).toBe(true);
  });

  it("accumulates volume across ticks", () => {
    const candle = Candle.open("c1", symbolCode(), Timeframe.M5, new Date(), price(1.1));
    const v = Volume.create(10);
    if (!v.ok) throw new Error("fixture failed");
    candle.updateWithTick(price(1.1), v.value);
    candle.updateWithTick(price(1.1), v.value);
    expect(candle.volume.units).toBe(20);
  });

  it("throws when updating an already-completed candle", () => {
    const candle = Candle.open("c1", symbolCode(), Timeframe.M5, new Date(), price(1.1));
    candle.complete();
    expect(() => candle.updateWithTick(price(1.2), Volume.zero())).toThrow();
  });
});

describe("Candle.complete", () => {
  it("marks the candle complete and raises CandleClosedEvent", () => {
    const candle = Candle.open("c1", symbolCode(), Timeframe.M5, new Date(), price(1.1));
    candle.pullDomainEvents();
    candle.complete();
    expect(candle.isComplete).toBe(true);
    expect(candle.pullDomainEvents()[0]?.kind).toBe("CandleClosed");
  });

  it("is idempotent — completing an already-complete candle raises no new event", () => {
    const candle = Candle.open("c1", symbolCode(), Timeframe.M5, new Date(), price(1.1));
    candle.complete();
    candle.pullDomainEvents();
    candle.complete();
    expect(candle.pullDomainEvents()).toHaveLength(0);
  });
});
