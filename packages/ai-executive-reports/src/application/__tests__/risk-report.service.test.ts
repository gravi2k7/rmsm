import { describe, expect, it } from "vitest";
import { Portfolio, RiskMonitorService, type PortfolioCalculator } from "@rmsm/portfolio";
import { RiskAnalysisService, DrawdownAnalysisService, RiskAlertService, ExposureMonitoringService } from "@rmsm/ai-risk-intelligence";
import { RiskAssessment, RiskScore, type RiskChecks } from "@rmsm/decision";
import { RiskReportService } from "../services/risk-report.service";
import { ReportPeriodService } from "../services/report-period.service";
import { ReportPeriod } from "../../domain/enums/executive-reports.enum";
import { FixedClock } from "./fakes";

class FakeCalculator implements PortfolioCalculator {
  async getCurrentPrice(): Promise<number> {
    return 1;
  }
}

describe("RiskReportService", () => {
  it("frames REAL AI-605 RiskAnalysis + DrawdownAnalysis + RiskAlerts into a periodic report, without recomputing any of them", async () => {
    const portfolio = Portfolio.create("p1", 100_000, new Date("2026-01-01"));
    const riskMonitor = new RiskMonitorService(new FakeCalculator());
    const exposure = await riskMonitor.computePortfolioExposure(portfolio, 100_000);

    const pass: RiskChecks[keyof RiskChecks] = { passed: true };
    const assessment = RiskAssessment.create("a1", {
      checks: { maxDailyLoss: pass, maxPositionSize: pass, exposureLimits: pass, correlationCheck: pass, marginCheck: pass },
      overallScore: (() => {
        const result = RiskScore.create(20);
        if (!result.ok) throw result.error;
        return result.value;
      })(),
      assessedAt: new Date("2026-01-01"),
    });

    const riskAnalysis = new RiskAnalysisService().analyze("p1", assessment);
    const drawdown = new DrawdownAnalysisService().analyze(portfolio, 100_000, 5);
    const exposureMonitoring = new ExposureMonitoringService().monitor("p1", [{ exposure, limitPercentage: 50 }]);
    const alerts = new RiskAlertService().evaluate(riskAnalysis, drawdown, exposureMonitoring);

    const service = new RiskReportService(new ReportPeriodService(), new FixedClock());
    const report = service.generate("p1", ReportPeriod.WEEKLY, riskAnalysis, drawdown, alerts);

    expect(report.narrative).toContain(riskAnalysis.verdict);
    expect(report.narrative).toContain(drawdown.verdict);
  });
});
