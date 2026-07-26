import { describe, expect, it } from "vitest";
import { PerformanceService, RiskMonitorService } from "@rmsm/portfolio";
import { PortfolioHealthService } from "../services/portfolio-health.service";
import { PortfolioHealthVerdict } from "../../domain/enums/portfolio-intelligence.enum";
import { buildPortfolio, buildTrade, FakePortfolioCalculator } from "./fakes";

describe("PortfolioHealthService", () => {
  const performanceService = new PerformanceService();
  const service = new PortfolioHealthService();

  it("rates a profitable, well-within-limits portfolio HEALTHY using REAL PerformanceService + RiskMonitorService output", async () => {
    const portfolio = buildPortfolio("p1", 100_000, [{ symbolCode: "EURUSD", side: "LONG", quantityUnits: 1000, averageEntryPrice: 1.1, marginRequired: 1000 }]);
    const trades = [buildTrade("t1", "EURUSD", "LONG", 1.1, 1.15), buildTrade("t2", "EURUSD", "LONG", 1.1, 1.12)];
    const performance = performanceService.computeMetrics(trades, []);

    const riskMonitor = new RiskMonitorService(new FakePortfolioCalculator(new Map([["EURUSD", 1.1]])));
    const exposure = await riskMonitor.computePortfolioExposure(portfolio, 100_000);

    const health = service.assess(portfolio, performance, exposure);
    expect(health.verdict).toBe(PortfolioHealthVerdict.HEALTHY);
  });

  it("rates an unprofitable portfolio with losing trades as not HEALTHY", async () => {
    const portfolio = buildPortfolio("p2", 100_000, [{ symbolCode: "EURUSD", side: "LONG", quantityUnits: 1000, averageEntryPrice: 1.1, marginRequired: 1000 }]);
    const trades = [buildTrade("t1", "EURUSD", "LONG", 1.1, 1.05), buildTrade("t2", "EURUSD", "LONG", 1.1, 1.02)];
    const performance = performanceService.computeMetrics(trades, []);

    const riskMonitor = new RiskMonitorService(new FakePortfolioCalculator(new Map([["EURUSD", 1.1]])));
    const exposure = await riskMonitor.computePortfolioExposure(portfolio, 100_000);

    const health = service.assess(portfolio, performance, exposure);
    expect(health.verdict).not.toBe(PortfolioHealthVerdict.HEALTHY);
  });
});
