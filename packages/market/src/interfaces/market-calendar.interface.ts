import type { MarketHoliday } from "../entities/market-holiday";

/**
 * The port for sourcing holiday data from outside this domain (e.g. a
 * vendor's own exchange-calendar API/dataset) — distinct from
 * `repositories/calendar.repository.ts`'s `CalendarRepository`, which is
 * this domain's own persistence port for `TradingCalendar` aggregates
 * once they're loaded into the domain. This interface is upstream of
 * that: how holiday data *gets into* a `TradingCalendar` in the first
 * place.
 */
export interface MarketCalendarProvider {
  getHolidays(exchangeId: string, from: Date, to: Date): Promise<MarketHoliday[]>;
}
