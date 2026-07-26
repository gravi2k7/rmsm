import { describe, expect, it } from "vitest";
import { PerformanceAttributionService } from "../services/performance-attribution.service";
import { buildTrade } from "./fakes";

describe("PerformanceAttributionService", () => {
  const service = new PerformanceAttributionService();

  it("groups REAL Trade records by symbol, summing realized P&L and win rate", () => {
    const trades = [
      buildTrade("t1", "EURUSD", "LONG", 1.1, 1.15),
      buildTrade("t2", "EURUSD", "LONG", 1.1, 1.05),
      buildTrade("t3", "GBPUSD", "LONG", 1.25, 1.3),
    ];

    const attribution = service.attribute("p1", trades);
    const eur = attribution.bySymbol.find((s) => s.symbolCode === "EURUSD");
    const gbp = attribution.bySymbol.find((s) => s.symbolCode === "GBPUSD");

    expect(eur?.tradeCount).toBe(2);
    expect(eur?.winRate).toBe(50);
    expect(gbp?.tradeCount).toBe(1);
    expect(gbp?.winRate).toBe(100);
  });
});
