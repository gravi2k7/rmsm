import { describe, expect, it } from "vitest";
import { EconomicCalendarService } from "../services/economic-calendar.service";
import { EventImportance } from "../../domain/enums/news-intelligence.enum";
import { FakeEconomicCalendarProvider } from "./fakes";

describe("EconomicCalendarService", () => {
  it("returns [] when no provider is wired in", async () => {
    const service = new EconomicCalendarService(undefined);
    expect(await service.getUpcomingHighImportanceEvents()).toEqual([]);
  });

  it("filters to only HIGH-importance events from a REAL-shaped provider", async () => {
    const provider = new FakeEconomicCalendarProvider([
      { id: "e1", name: "CPI Release", country: "US", importance: EventImportance.HIGH, scheduledAt: new Date(), relatedSymbols: ["EURUSD"] },
      { id: "e2", name: "Minor Data", country: "US", importance: EventImportance.LOW, scheduledAt: new Date(), relatedSymbols: [] },
    ]);
    const service = new EconomicCalendarService(provider);

    const results = await service.getUpcomingHighImportanceEvents();
    expect(results).toHaveLength(1);
    expect(results[0]?.id).toBe("e1");
  });
});
