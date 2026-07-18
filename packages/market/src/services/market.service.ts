import { ok, err, type Result } from "@rmsm/core";
import type { ExchangeRepository } from "../repositories/exchange.repository";
import { CalendarService } from "./calendar.service";
import type { MarketStatus } from "../types/market-status";
import { UnknownExchangeError } from "../errors/market.errors";

/**
 * The top-level domain service answering "what's this exchange's status
 * right now" — combines `Exchange.tradingHours`/`weekendDays` with
 * `CalendarService`'s own holiday-aware trading-day check, rather than
 * either being consulted alone (an exchange can have valid trading hours
 * configured for today and still be closed for a holiday; checking hours
 * without the calendar would get that wrong).
 */
export class MarketService {
  constructor(
    private readonly exchangeRepository: ExchangeRepository,
    private readonly calendarService: CalendarService,
  ) {}

  async getStatus(exchangeId: string, asOf: Date = new Date()): Promise<Result<MarketStatus, UnknownExchangeError>> {
    const exchange = await this.exchangeRepository.findById(exchangeId);
    if (!exchange) return err(new UnknownExchangeError(exchangeId));

    // Checked first, independently of the calendar: TradingCalendar.isTradingDay()
    // conflates "closed for the weekend" and "closed for a holiday" into a
    // single boolean (by design — see its own doc comment), so it can't tell
    // MarketService which of the two applies. The weekend check here uses
    // Exchange's own weekendDays directly instead, so a weekend day reports
    // "CLOSED" and only a genuine holiday on a would-be trading day reports
    // "HOLIDAY".
    const dayOfWeek = asOf.getUTCDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;
    if (exchange.isWeekendDay(dayOfWeek)) {
      return ok("CLOSED");
    }

    const tradingDayResult = await this.calendarService.isOpenToday(exchangeId, asOf);
    if (!tradingDayResult.ok) return tradingDayResult;

    if (!tradingDayResult.value) {
      return ok("HOLIDAY");
    }

    const hours = exchange.tradingHoursFor(dayOfWeek);
    if (!hours) return ok("CLOSED");

    const currentTime = `${String(asOf.getUTCHours()).padStart(2, "0")}:${String(asOf.getUTCMinutes()).padStart(2, "0")}`;
    if (currentTime >= hours.openTime && currentTime < hours.closeTime) {
      return ok("OPEN");
    }
    return ok("CLOSED");
  }
}
