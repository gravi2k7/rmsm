import { describe, expect, it } from "vitest";
import { RiskMonitorService } from "@rmsm/portfolio";
import { ExposureAnalysisService } from "../services/exposure-analysis.service";
import { buildPortfolio, FakePortfolioCalculator } from "./fakes";

describe("ExposureAnalysisService", () => {
  const service = new ExposureAnalysisService();

  it("flags a REAL Exposure that exceeds the given limit", async () => {
    const portfolio = buildPortfolio("p1", 100_000, [{ symbolCode: "EURUSD", side: "LONG", quantityUnits: 60_000, averageEntryPrice: 1, marginRequired: 30_000 }]);
    const riskMonitor = new RiskMonitorService(new FakePortfolioCalculator(new Map([["EURUSD", 1]])));
    const exposure = await riskMonitor.computePortfolioExposure(portfolio, 100_000);

    const result = service.analyze("p1", exposure, 50);
    expect(result.withinLimit).toBe(false);
    expect(result.percentage).toBeCloseTo(60, 5);
  });

  it("passes a REAL Exposure within the given limit", async () => {
    const portfolio = buildPortfolio("p2", 100_000, [{ symbolCode: "EURUSD", side: "LONG", quantityUnits: 10_000, averageEntryPrice: 1, marginRequired: 5000 }]);
    const riskMonitor = new RiskMonitorService(new FakePortfolioCalculator(new Map([["EURUSD", 1]])));
    const exposure = await riskMonitor.computePortfolioExposure(portfolio, 100_000);

    const result = service.analyze("p2", exposure, 50);
    expect(result.withinLimit).toBe(true);
  });
});
