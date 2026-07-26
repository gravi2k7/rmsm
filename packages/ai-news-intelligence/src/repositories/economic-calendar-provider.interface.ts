import type { SymbolCode } from "@rmsm/market";
import type { EconomicCalendarEvent } from "../domain/entities/economic-calendar-event.entity";

/** The port to a real economic calendar feed — implemented entirely
 * outside this package. Ships with ZERO implementations. */
export interface EconomicCalendarProvider {
  getUpcomingEvents(symbolCode?: SymbolCode, withinHours?: number): Promise<readonly EconomicCalendarEvent[]>;
}
