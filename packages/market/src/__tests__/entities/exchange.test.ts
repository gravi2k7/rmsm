import { describe, expect, it } from "vitest";
import { Exchange } from "../../entities/exchange";

function buildExchange() {
  return Exchange.create("ex-1", {
    name: "NYSE",
    country: "US",
    timezone: "America/New_York",
    type: "STOCK",
    tradingHours: [{ dayOfWeek: 1, openTime: "09:30", closeTime: "16:00" }],
    weekendDays: [0, 6],
  });
}

describe("Exchange.create", () => {
  it("starts closed", () => {
    expect(buildExchange().isOpen).toBe(false);
  });

  it("rejects an empty id", () => {
    expect(() =>
      Exchange.create("", { name: "X", country: "US", timezone: "UTC", type: "STOCK", tradingHours: [], weekendDays: [] }),
    ).toThrow();
  });
});

describe("Exchange open/close", () => {
  it("open() marks it open and raises MarketOpenedEvent", () => {
    const exchange = buildExchange();
    exchange.open();
    expect(exchange.isOpen).toBe(true);
    const events = exchange.pullDomainEvents();
    expect(events).toHaveLength(1);
    expect(events[0]?.kind).toBe("MarketOpened");
  });

  it("open() on an already-open exchange is a no-op, no duplicate event", () => {
    const exchange = buildExchange();
    exchange.open();
    exchange.pullDomainEvents();
    exchange.open();
    expect(exchange.pullDomainEvents()).toHaveLength(0);
  });

  it("close() marks it closed and raises MarketClosedEvent", () => {
    const exchange = buildExchange();
    exchange.open();
    exchange.pullDomainEvents();
    exchange.close();
    expect(exchange.isOpen).toBe(false);
    const events = exchange.pullDomainEvents();
    expect(events[0]?.kind).toBe("MarketClosed");
  });
});

describe("Exchange.isWeekendDay / tradingHoursFor", () => {
  it("identifies configured weekend days", () => {
    const exchange = buildExchange();
    expect(exchange.isWeekendDay(0)).toBe(true);
    expect(exchange.isWeekendDay(1)).toBe(false);
  });

  it("returns trading hours for a configured day", () => {
    const exchange = buildExchange();
    expect(exchange.tradingHoursFor(1)).toEqual({ dayOfWeek: 1, openTime: "09:30", closeTime: "16:00" });
  });

  it("returns undefined for a day with no configured hours", () => {
    const exchange = buildExchange();
    expect(exchange.tradingHoursFor(2)).toBeUndefined();
  });
});
