import { ok, err, type Result } from "@rmsm/core";
import type { CalendarRepository } from "../repositories/calendar.repository";
import type { TradingCalendar } from "../entities/trading-calendar";
import { UnknownExchangeError } from "../errors/market.errors";

/** Domain service wrapping `TradingCalendar` lookups — the thin
 * orchestration layer between "I have an exchange id" and "here's
 * whether it's a trading day," delegating the actual weekend/holiday
 * logic to `TradingCalendar` itself rather than duplicating it here. */
export class CalendarService {
  constructor(private readonly calendarRepository: CalendarRepository) {}

  private async getCalendar(exchangeId: string): Promise<Result<TradingCalendar, UnknownExchangeError>> {
    const calendar = await this.calendarRepository.findByExchange(exchangeId);
    if (!calendar) return err(new UnknownExchangeError(exchangeId));
    return ok(calendar);
  }

  async isOpenToday(exchangeId: string, asOf: Date = new Date()): Promise<Result<boolean, UnknownExchangeError>> {
    const result = await this.getCalendar(exchangeId);
    if (!result.ok) return result;
    return ok(result.value.isTradingDay(asOf));
  }

  async nextTradingDay(exchangeId: string, from: Date = new Date()): Promise<Result<Date, UnknownExchangeError>> {
    const result = await this.getCalendar(exchangeId);
    if (!result.ok) return result;
    return ok(result.value.nextTradingDay(from));
  }

  async previousTradingDay(exchangeId: string, from: Date = new Date()): Promise<Result<Date, UnknownExchangeError>> {
    const result = await this.getCalendar(exchangeId);
    if (!result.ok) return result;
    return ok(result.value.previousTradingDay(from));
  }
}
