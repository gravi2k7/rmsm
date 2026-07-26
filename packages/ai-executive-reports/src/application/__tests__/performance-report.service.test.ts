import { describe, expect, it } from "vitest";
import { PerformanceService } from "@rmsm/portfolio";
import { PerformanceReportService } from "../services/performance-report.service";
import { ReportPeriodService } from "../services/report-period.service";
import { ReportPeriod } from "../../domain/enums/executive-reports.enum";
import { FixedClock } from "./fakes";

describe("PerformanceReportService", () => {
  it("frames REAL @rmsm/portfolio PerformanceMetrics into a periodic report, without recomputing them", () => {
    const metrics = new PerformanceService().computeMetrics([], []);
    const service = new PerformanceReportService(new ReportPeriodService(), new FixedClock());

    const report = service.generate("p1", ReportPeriod.MONTHLY, metrics);
    expect(report.narrative).toContain("0 trade(s)");
    expect(report.metrics).toBe(metrics);
  });
});
