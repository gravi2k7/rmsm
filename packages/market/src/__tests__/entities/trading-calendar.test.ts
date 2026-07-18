import { describe, expect, it } from "vitest";
import { TradingCalendar } from "../../entities/trading-calendar";
import { MarketHoliday } from "../../entities/market-holiday";

function buildCalendar() {
  return TradingCalendar.create("cal-1", "ex-1", [0, 6]); // weekends: Sun, Sat
}

describe("TradingCalendar.isTradingDay", () => {
  it("returns false on a configured weekend day", () => {
    const calendar = buildCalendar();
    const sunday = new Date("2026-01-04T12:00:00Z"); // a Sunday
    expect(calendar.isTradingDay(sunday)).toBe(false);
  });

  it("returns true on a normal weekday with no holiday", () => {
    const calendar = buildCalendar();
    const wednesday = new Date("2026-01-07T12:00:00Z");
    expect(calendar.isTradingDay(wednesday)).toBe(true);
  });

  it("returns false on a full-day holiday", () => {
    const calendar = buildCalendar();
    const holiday = MarketHoliday.create("h1", { exchangeId: "ex-1", name: "New Year", date: new Date("2026-01-01T00:00:00Z"), isFullDayClosure: true });
    calendar.addHoliday(holiday, new Date("2025-01-01T00:00:00Z")); // registered well before the holiday itself
    expect(calendar.isTradingDay(new Date("2026-01-01T12:00:00Z"))).toBe(false);
  });

  it("a half-day holiday does not affect isTradingDay (weekday remains a trading day)", () => {
    const calendar = buildCalendar();
    const holiday = MarketHoliday.create("h2", { exchangeId: "ex-1", name: "Half Day", date: new Date("2026-01-07T00:00:00Z"), isFullDayClosure: false });
    calendar.addHoliday(holiday, new Date("2025-01-01T00:00:00Z"));
    expect(calendar.isTradingDay(new Date("2026-01-07T12:00:00Z"))).toBe(true);
  });
});

describe("TradingCalendar.addHoliday", () => {
  it("raises HolidayStartedEvent only when the holiday date matches 'now'", () => {
    const calendar = buildCalendar();
    const today = new Date("2026-01-01T08:00:00Z");
    const holiday = MarketHoliday.create("h1", { exchangeId: "ex-1", name: "New Year", date: today, isFullDayClosure: true });

    calendar.addHoliday(holiday, today);

    const events = calendar.pullDomainEvents();
    expect(events).toHaveLength(1);
    expect(events[0]?.kind).toBe("HolidayStarted");
  });

  it("does not raise the event when registering a future holiday", () => {
    const calendar = buildCalendar();
    const future = new Date("2026-12-25T00:00:00Z");
    const holiday = MarketHoliday.create("h2", { exchangeId: "ex-1", name: "Christmas", date: future, isFullDayClosure: true });

    calendar.addHoliday(holiday, new Date("2026-01-01T00:00:00Z"));

    expect(calendar.pullDomainEvents()).toHaveLength(0);
  });
});

describe("TradingCalendar.nextTradingDay / previousTradingDay", () => {
  it("skips over a weekend to find the next trading day", () => {
    const calendar = buildCalendar();
    const friday = new Date("2026-01-02T12:00:00Z"); // Friday
    const next = calendar.nextTradingDay(friday);
    expect(next.getUTCDay()).toBe(1); // Monday
  });

  it("skips backward over a weekend to find the previous trading day", () => {
    const calendar = buildCalendar();
    const monday = new Date("2026-01-05T12:00:00Z");
    const previous = calendar.previousTradingDay(monday);
    expect(previous.getUTCDay()).toBe(5); // Friday
  });
});
