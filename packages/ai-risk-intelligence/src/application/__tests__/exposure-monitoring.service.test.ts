import { describe, expect, it } from "vitest";
import { RiskMonitorService, type PortfolioCalculator } from "@rmsm/portfolio";
import { ExposureMonitoringService } from "../services/exposure-monitoring.service";
import { buildPortfolioWithPeak, buildPosition } from "./fakes";

class FakeCalculator implements PortfolioCalculator {
  constructor(private readonly price: number) {}
  async getCurrentPrice(): Promise<number> {
    return this.price;
  }
}

describe("ExposureMonitoringService", () => {
  const service = new ExposureMonitoringService();

  it("flags anyBreached when a REAL Exposure from RiskMonitorService exceeds its limit", async () => {
    const portfolio = buildPortfolioWithPeak("p1", 100_000, 100_000);
    portfolio.openPosition(buildPosition("pos-1", "EURUSD", "LONG", 60_000, 1), 30_000);

    const riskMonitor = new RiskMonitorService(new FakeCalculator(1));
    const exposure = await riskMonitor.computeSymbolExposure(portfolio, "EURUSD", 100_000);

    const result = service.monitor("p1", [{ exposure, limitPercentage: 50 }]);
    expect(result.anyBreached).toBe(true);
    expect(result.exposures[0]?.withinLimit).toBe(false);
  });
});
