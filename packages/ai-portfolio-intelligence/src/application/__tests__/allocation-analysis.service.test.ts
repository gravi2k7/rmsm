import { describe, expect, it } from "vitest";
import { RiskMonitorService } from "@rmsm/portfolio";
import { AllocationAnalysisService } from "../services/allocation-analysis.service";
import { buildPortfolio, FakePortfolioCalculator } from "./fakes";

describe("AllocationAnalysisService", () => {
  const service = new AllocationAnalysisService();

  it("reads REAL per-symbol Exposure.percentage into a weight breakdown", async () => {
    const portfolio = buildPortfolio("p1", 100_000, [
      { symbolCode: "EURUSD", side: "LONG", quantityUnits: 10_000, averageEntryPrice: 1, marginRequired: 5000 },
      { symbolCode: "GBPUSD", side: "LONG", quantityUnits: 5_000, averageEntryPrice: 1, marginRequired: 2500 },
    ]);
    const riskMonitor = new RiskMonitorService(new FakePortfolioCalculator(new Map([["EURUSD", 1], ["GBPUSD", 1]])));

    const eurExposure = await riskMonitor.computeSymbolExposure(portfolio, "EURUSD", 100_000);
    const gbpExposure = await riskMonitor.computeSymbolExposure(portfolio, "GBPUSD", 100_000);

    const breakdown = service.analyze(portfolio, [
      { symbolCode: "EURUSD", exposure: eurExposure },
      { symbolCode: "GBPUSD", exposure: gbpExposure },
    ]);

    expect(breakdown.allocations).toEqual([
      { symbolCode: "EURUSD", weightPercentage: 10 },
      { symbolCode: "GBPUSD", weightPercentage: 5 },
    ]);
  });
});
