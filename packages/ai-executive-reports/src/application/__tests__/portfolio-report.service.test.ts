import { describe, expect, it } from "vitest";
import { Portfolio, PerformanceService, RiskMonitorService, type PortfolioCalculator } from "@rmsm/portfolio";
import { PortfolioHealthService, DiversificationAnalysisService } from "@rmsm/ai-portfolio-intelligence";
import { PortfolioReportService } from "../services/portfolio-report.service";
import { ReportPeriodService } from "../services/report-period.service";
import { ReportPeriod } from "../../domain/enums/executive-reports.enum";
import { FixedClock } from "./fakes";

class FakeCalculator implements PortfolioCalculator {
  async getCurrentPrice(): Promise<number> {
    return 1;
  }
}

describe("PortfolioReportService", () => {
  it("frames REAL AI-604 PortfolioHealth + DiversificationAnalysis into a periodic report, without recomputing either", async () => {
    const portfolio = Portfolio.create("p1", 100_000, new Date("2026-01-01"));
    const riskMonitor = new RiskMonitorService(new FakeCalculator());
    const exposure = await riskMonitor.computePortfolioExposure(portfolio, 100_000);

    const health = new PortfolioHealthService().assess(portfolio, new PerformanceService().computeMetrics([], []), exposure);
    const diversification = new DiversificationAnalysisService().analyze("p1", [{ symbolCode: "EURUSD", exposure }]);

    const service = new PortfolioReportService(new ReportPeriodService(), new FixedClock());
    const report = service.generate("p1", ReportPeriod.DAILY, health, diversification);

    expect(report.narrative).toContain(health.verdict);
    expect(report.narrative).toContain(diversification.level);
    expect(report.window.end).toEqual(new FixedClock().now());
  });
});
