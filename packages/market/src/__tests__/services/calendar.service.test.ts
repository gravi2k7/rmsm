import { describe, expect, it } from "vitest";
import { CalendarService } from "../../services/calendar.service";
import { TradingCalendar } from "../../entities/trading-calendar";
import type { CalendarRepository } from "../../repositories/calendar.repository";

function fakeRepo(calendar: TradingCalendar | null): CalendarRepository {
  return {
    findByExchange: async () => calendar,
    save: async () => undefined,
    findTradingDay: async () => null,
    saveTradingDay: async () => undefined,
  };
}

describe("CalendarService.isOpenToday", () => {
  it("returns UnknownExchangeError for an unregistered exchange", async () => {
    const service = new CalendarService(fakeRepo(null));
    const result = await service.isOpenToday("ex-missing");
    expect(result.ok).toBe(false);
  });

  it("delegates to the calendar's own isTradingDay", async () => {
    const calendar = TradingCalendar.create("cal-1", "ex-1", [0, 6]);
    const service = new CalendarService(fakeRepo(calendar));
    const sunday = new Date("2026-01-04T12:00:00Z");
    const result = await service.isOpenToday("ex-1", sunday);
    expect(result.ok && result.value).toBe(false);
  });
});

describe("CalendarService.nextTradingDay / previousTradingDay", () => {
  it("returns the next trading day", async () => {
    const calendar = TradingCalendar.create("cal-1", "ex-1", [0, 6]);
    const service = new CalendarService(fakeRepo(calendar));
    const friday = new Date("2026-01-02T12:00:00Z");
    const result = await service.nextTradingDay("ex-1", friday);
    expect(result.ok && result.value.getUTCDay()).toBe(1);
  });

  it("returns UnknownExchangeError when the exchange has no calendar", async () => {
    const service = new CalendarService(fakeRepo(null));
    const result = await service.previousTradingDay("ex-missing");
    expect(result.ok).toBe(false);
  });
});
