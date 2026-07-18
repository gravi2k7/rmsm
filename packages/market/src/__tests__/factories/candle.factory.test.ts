import { describe, expect, it } from "vitest";
import { CandleFactory, type RawOhlcvInput } from "../../factories/candle.factory";
import { SymbolCode } from "../../value-objects/symbol-code";
import { Price } from "../../value-objects/price";
import { Volume } from "../../value-objects/volume";
import { Tick } from "../../entities/tick";
import { Timeframe } from "../../enums/timeframe.enum";

function validOhlcv(): RawOhlcvInput {
  return {
    id: "c1",
    symbolCode: "eurusd",
    timeframe: Timeframe.M5,
    timestamp: new Date("2026-01-01T14:05:00Z"),
    open: 1.1,
    high: 1.12,
    low: 1.09,
    close: 1.105,
    volume: 1000,
    precision: 5,
    isComplete: true,
  };
}

describe("CandleFactory.fromOhlcv", () => {
  it("builds a Candle matching the given OHLCV values", () => {
    const result = CandleFactory.fromOhlcv(validOhlcv());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.open.amount).toBe(1.1);
      expect(result.value.high.amount).toBe(1.12);
      expect(result.value.low.amount).toBe(1.09);
      expect(result.value.close.amount).toBe(1.105);
      expect(result.value.volume.units).toBe(1000);
      expect(result.value.isComplete).toBe(true);
    }
  });

  it("leaves the candle incomplete when isComplete is false", () => {
    const result = CandleFactory.fromOhlcv({ ...validOhlcv(), isComplete: false });
    expect(result.ok && result.value.isComplete).toBe(false);
  });

  it("fails on an invalid symbol code", () => {
    const result = CandleFactory.fromOhlcv({ ...validOhlcv(), symbolCode: "!!!" });
    expect(result.ok).toBe(false);
  });

  it("fails OHLC validation when high is below open/close", () => {
    const result = CandleFactory.fromOhlcv({ ...validOhlcv(), high: 1.0 });
    expect(result.ok).toBe(false);
  });
});

describe("CandleFactory.fromTicks", () => {
  function tick(bid: number, timestamp: Date) {
    const price = Price.create(bid, 5);
    if (!price.ok) throw new Error("fixture failed");
    return Tick.receive("t", { symbolCode: symbolCode(), timestamp, bid: price.value, ask: price.value, volume: Volume.zero() });
  }
  function symbolCode() {
    const r = SymbolCode.create("EURUSD");
    if (!r.ok) throw new Error("fixture failed");
    return r.value;
  }

  it("fails on an empty tick array", () => {
    const result = CandleFactory.fromTicks("c1", symbolCode(), Timeframe.M5, []);
    expect(result.ok).toBe(false);
  });

  it("aggregates a tick stream into one candle with the correct open/high/low/close", () => {
    const ticks = [
      tick(1.1, new Date("2026-01-01T14:00:00Z")),
      tick(1.12, new Date("2026-01-01T14:01:00Z")),
      tick(1.09, new Date("2026-01-01T14:02:00Z")),
      tick(1.105, new Date("2026-01-01T14:03:00Z")),
    ];
    const result = CandleFactory.fromTicks("c1", symbolCode(), Timeframe.M5, ticks);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.open.amount).toBe(1.1);
      expect(result.value.high.amount).toBe(1.12);
      expect(result.value.low.amount).toBe(1.09);
      expect(result.value.close.amount).toBe(1.105);
    }
  });
});
