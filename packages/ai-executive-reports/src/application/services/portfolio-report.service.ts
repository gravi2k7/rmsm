import type { Clock } from "@rmsm/core";
import { SystemClock } from "@rmsm/core";
import type { PortfolioHealth, DiversificationAnalysis } from "@rmsm/ai-portfolio-intelligence";
import type { PortfolioReport } from "../../domain/entities/portfolio-report.entity";
import type { ReportPeriod } from "../../domain/enums/executive-reports.enum";
import { ReportPeriodService } from "./report-period.service";

/** Reads a REAL `@rmsm/ai-portfolio-intelligence` (AI-604)
 * `PortfolioHealth` and `DiversificationAnalysis` — never recomputes
 * either; only frames them into a periodic report. */
export class PortfolioReportService {
  constructor(
    private readonly periodService: ReportPeriodService = new ReportPeriodService(),
    private readonly clock: Clock = new SystemClock(),
  ) {}

  generate(portfolioId: string, period: ReportPeriod, health: PortfolioHealth, diversification: DiversificationAnalysis): PortfolioReport {
    const now = this.clock.now();
    const window = this.periodService.windowFor(period, now);
    const narrative = `Portfolio ${portfolioId} (${period}): health is ${health.verdict}, diversification is ${diversification.level}. ${diversification.reason}`;

    return { portfolioId, period, window, health, diversification, narrative, generatedAt: now };
  }
}
