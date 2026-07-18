import type { TradingCalendar } from "../entities/trading-calendar";
import type { TradingDay } from "../entities/trading-day";

export interface CalendarRepository {
  findByExchange(exchangeId: string): Promise<TradingCalendar | null>;
  save(calendar: TradingCalendar): Promise<void>;

  findTradingDay(exchangeId: string, date: Date): Promise<TradingDay | null>;
  saveTradingDay(tradingDay: TradingDay): Promise<void>;
}
