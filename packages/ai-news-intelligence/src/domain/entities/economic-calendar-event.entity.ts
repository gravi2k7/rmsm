import type { EventImportance } from "../enums/news-intelligence.enum";

/** The consumer-facing shape a REAL `EconomicCalendarProvider`
 * (implemented entirely outside this package) is expected to return. */
export interface EconomicCalendarEvent {
  readonly id: string;
  readonly name: string;
  readonly country: string;
  readonly importance: EventImportance;
  readonly scheduledAt: Date;
  readonly relatedSymbols: readonly string[];
}
