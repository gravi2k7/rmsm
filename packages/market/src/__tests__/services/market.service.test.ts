import { describe, expect, it } from "vitest";
import { MarketService } from "../../services/market.service";
import { CalendarService } from "../../services/calendar.service";
import { Exchange } from "../../entities/exchange";
import { TradingCalendar } from "../../entities/trading-calendar";
import { MarketHoliday } from "../../entities/market-holiday";
import type { ExchangeRepository } from "../../repositories/exchange.repository";
import type { CalendarRepository } from "../../repositories/calendar.repository";

function buildExchange() {
  return Exchange.create("ex-1", {
    name: "NYSE",
    country: "US",
    timezone: "America/New_York",
    type: "STOCK",
    tradingHours: [{ dayOfWeek: 4, openTime: "09:30", closeTime: "16:00" }], // Thursday
    weekendDays: [0, 6],
  });
}

function fakeExchangeRepo(exchange: Exchange | null): ExchangeRepository {
  return {
    findById: async () => exchange,
    findAll: async () => [],
    save: async () => undefined,
    findSessionByType: async () => null,
    findAllSessions: async () => [],
    saveSession: async () => undefined,
  };
}

function fakeCalendarRepo(calendar: TradingCalendar): CalendarRepository {
  return {
    findByExchange: async () => calendar,
    save: async () => undefined,
    findTradingDay: async () => null,
    saveTradingDay: async () => undefined,
  };
}

describe("MarketService.getStatus", () => {
  it("returns UnknownExchangeError for an unregistered exchange", async () => {
    const calendarService = new CalendarService(fakeCalendarRepo(TradingCalendar.create("cal-1", "ex-1", [0, 6])));
    const service = new MarketService(fakeExchangeRepo(null), calendarService);
    const result = await service.getStatus("ex-missing");
    expect(result.ok).toBe(false);
  });

  it("returns HOLIDAY on a full-day holiday even during normal trading hours", async () => {
    const calendar = TradingCalendar.create("cal-1", "ex-1", [0, 6]);
    calendar.addHoliday(
      MarketHoliday.create("h1", { exchangeId: "ex-1", name: "New Year", date: new Date("2026-01-01T00:00:00Z"), isFullDayClosure: true }),
      new Date("2025-01-01T00:00:00Z"),
    );
    const calendarService = new CalendarService(fakeCalendarRepo(calendar));
    const service = new MarketService(fakeExchangeRepo(buildExchange()), calendarService);

    const result = await service.getStatus("ex-1", new Date("2026-01-01T12:00:00Z"));
    expect(result.ok && result.value).toBe("HOLIDAY");
  });

  it("returns CLOSED on a configured weekend day", async () => {
    const calendarService = new CalendarService(fakeCalendarRepo(TradingCalendar.create("cal-1", "ex-1", [0, 6])));
    const service = new MarketService(fakeExchangeRepo(buildExchange()), calendarService);

    const sunday = new Date("2026-01-04T12:00:00Z");
    const result = await service.getStatus("ex-1", sunday);
    expect(result.ok && result.value).toBe("CLOSED");
  });

  it("returns OPEN during configured trading hours on a trading day", async () => {
    const calendarService = new CalendarService(fakeCalendarRepo(TradingCalendar.create("cal-1", "ex-1", [0, 6])));
    const service = new MarketService(fakeExchangeRepo(buildExchange()), calendarService);

    const thursdayDuringHours = new Date("2026-01-01T14:00:00Z"); // Thursday, within 09:30-16:00
    const result = await service.getStatus("ex-1", thursdayDuringHours);
    expect(result.ok && result.value).toBe("OPEN");
  });

  it("returns CLOSED outside configured trading hours on a trading day", async () => {
    const calendarService = new CalendarService(fakeCalendarRepo(TradingCalendar.create("cal-1", "ex-1", [0, 6])));
    const service = new MarketService(fakeExchangeRepo(buildExchange()), calendarService);

    const thursdayAfterHours = new Date("2026-01-01T20:00:00Z");
    const result = await service.getStatus("ex-1", thursdayAfterHours);
    expect(result.ok && result.value).toBe("CLOSED");
  });
});
