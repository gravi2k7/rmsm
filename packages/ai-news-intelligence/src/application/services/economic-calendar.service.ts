import type { SymbolCode } from "@rmsm/market";
import type { EconomicCalendarProvider } from "../../repositories/economic-calendar-provider.interface";
import type { EconomicCalendarEvent } from "../../domain/entities/economic-calendar-event.entity";
import { EventImportance } from "../../domain/enums/news-intelligence.enum";

/** Delegates entirely to an `EconomicCalendarProvider` (a future,
 * currently-unimplemented port) — returns `[]`, explicitly, when no
 * provider is wired in, rather than fabricating events. */
export class EconomicCalendarService {
  constructor(private readonly provider: EconomicCalendarProvider | undefined) {}

  async getUpcomingHighImportanceEvents(symbolCode?: SymbolCode, withinHours = 24): Promise<readonly EconomicCalendarEvent[]> {
    if (!this.provider) return [];
    const events = await this.provider.getUpcomingEvents(symbolCode, withinHours);
    return events.filter((event) => event.importance === EventImportance.HIGH);
  }
}
