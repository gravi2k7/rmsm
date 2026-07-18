import { describe, expect, it } from "vitest";
import { Tick } from "../../entities/tick";
import { Quote } from "../../entities/quote";
import { TimeframeInfo } from "../../entities/timeframe";
import { MarketHoliday } from "../../entities/market-holiday";
import { TradingDay } from "../../entities/trading-day";
import { Instrument } from "../../entities/instrument";
import { SymbolCode } from "../../value-objects/symbol-code";
import { Price } from "../../value-objects/price";
import { Volume } from "../../value-objects/volume";
import { Timeframe } from "../../enums/timeframe.enum";

function price(amount: number) {
  const r = Price.create(amount, 5);
  if (!r.ok) throw new Error("fixture failed");
  return r.value;
}
function symbolCode() {
  const r = SymbolCode.create("EURUSD");
  if (!r.ok) throw new Error("fixture failed");
  return r.value;
}

describe("Tick.receive", () => {
  it("raises TickReceivedEvent", () => {
    const tick = Tick.receive("t1", { symbolCode: symbolCode(), timestamp: new Date(), bid: price(1.1), ask: price(1.1002), volume: Volume.zero() });
    expect(tick.pullDomainEvents()[0]?.kind).toBe("TickReceived");
  });

  it("last is optional and undefined when not provided", () => {
    const tick = Tick.receive("t1", { symbolCode: symbolCode(), timestamp: new Date(), bid: price(1.1), ask: price(1.1002), volume: Volume.zero() });
    expect(tick.last).toBeUndefined();
  });
});

describe("Quote.mid / spread", () => {
  it("computes the midpoint between bid and ask", () => {
    const quote = Quote.create("q1", { symbolCode: symbolCode(), timestamp: new Date(), bid: price(1.1), ask: price(1.2) });
    expect(quote.mid.amount).toBeCloseTo(1.15);
  });

  it("computes a valid spread from bid/ask", () => {
    const quote = Quote.create("q1", { symbolCode: symbolCode(), timestamp: new Date(), bid: price(1.1), ask: price(1.1002) });
    const spread = quote.spread;
    expect(spread.ok && spread.value.value).toBeCloseTo(0.0002);
  });
});

describe("TimeframeInfo", () => {
  it("computes fixed durations correctly", () => {
    expect(TimeframeInfo.from(Timeframe.M5).durationSeconds).toBe(300);
    expect(TimeframeInfo.from(Timeframe.H1).durationSeconds).toBe(3600);
  });

  it("TICK and MN1 have no fixed duration", () => {
    expect(TimeframeInfo.from(Timeframe.TICK).hasFixedDuration()).toBe(false);
    expect(TimeframeInfo.from(Timeframe.MN1).hasFixedDuration()).toBe(false);
  });

  it("alignToBoundary floors to the timeframe's own interval", () => {
    const m5 = TimeframeInfo.from(Timeframe.M5);
    const aligned = m5.alignToBoundary(new Date("2026-01-01T14:07:32Z"));
    expect(aligned.toISOString()).toBe("2026-01-01T14:05:00.000Z");
  });

  it("nextBoundary is exactly one duration after alignToBoundary", () => {
    const m5 = TimeframeInfo.from(Timeframe.M5);
    const instant = new Date("2026-01-01T14:07:32Z");
    const next = m5.nextBoundary(instant);
    expect(next.toISOString()).toBe("2026-01-01T14:10:00.000Z");
  });

  it("alignToBoundary throws for TICK", () => {
    expect(() => TimeframeInfo.from(Timeframe.TICK).alignToBoundary(new Date())).toThrow();
  });
});

describe("MarketHoliday.isOnDate", () => {
  it("compares by UTC calendar date, ignoring time-of-day", () => {
    const holiday = MarketHoliday.create("h1", { exchangeId: "ex-1", name: "New Year", date: new Date("2026-01-01T15:30:00Z"), isFullDayClosure: true });
    expect(holiday.isOnDate(new Date("2026-01-01T02:00:00Z"))).toBe(true);
    expect(holiday.isOnDate(new Date("2026-01-02T15:30:00Z"))).toBe(false);
  });
});

describe("TradingDay", () => {
  it("carries an optional holidayName only when not a trading day due to a holiday", () => {
    const day = TradingDay.create("td1", { exchangeId: "ex-1", date: new Date(), isTradingDay: false, holidayName: "Christmas" });
    expect(day.isTradingDay).toBe(false);
    expect(day.holidayName).toBe("Christmas");
  });
});

describe("Instrument.isExpired", () => {
  it("is never expired when it has no expiry", () => {
    const instrument = Instrument.create("i1", { symbolCode: symbolCode(), exchangeId: "ex-1", assetClass: "FOREX", instrumentType: "SPOT", isTradable: true });
    expect(instrument.isExpired()).toBe(false);
  });

  it("is expired once past its own expiresAt", () => {
    const instrument = Instrument.create("i1", {
      symbolCode: symbolCode(),
      exchangeId: "ex-1",
      assetClass: "FUTURES",
      instrumentType: "FUTURE",
      isTradable: true,
      expiresAt: new Date("2026-01-01T00:00:00Z"),
    });
    expect(instrument.isExpired(new Date("2026-02-01T00:00:00Z"))).toBe(true);
    expect(instrument.isExpired(new Date("2025-12-01T00:00:00Z"))).toBe(false);
  });
});
