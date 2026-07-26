import type { Clock } from "@rmsm/core";
import { SystemClock } from "@rmsm/core";
import type { RiskAnalysis, DrawdownAnalysis, RiskAlert } from "@rmsm/ai-risk-intelligence";
import type { RiskReport } from "../../domain/entities/risk-report.entity";
import type { ReportPeriod } from "../../domain/enums/executive-reports.enum";
import { ReportPeriodService } from "./report-period.service";

/** Reads REAL `@rmsm/ai-risk-intelligence` (AI-605) `RiskAnalysis`,
 * `DrawdownAnalysis`, and `RiskAlert`s — never recomputes any of them. */
export class RiskReportService {
  constructor(
    private readonly periodService: ReportPeriodService = new ReportPeriodService(),
    private readonly clock: Clock = new SystemClock(),
  ) {}

  generate(subjectId: string, period: ReportPeriod, riskAnalysis: RiskAnalysis, drawdown: DrawdownAnalysis, alerts: readonly RiskAlert[]): RiskReport {
    const now = this.clock.now();
    const window = this.periodService.windowFor(period, now);
    const narrative = `Risk for ${subjectId} (${period}): ${riskAnalysis.verdict}, drawdown ${drawdown.verdict}. ${alerts.length} active alert(s).`;

    return { subjectId, period, window, riskAnalysis, drawdown, alerts, narrative, generatedAt: now };
  }
}
