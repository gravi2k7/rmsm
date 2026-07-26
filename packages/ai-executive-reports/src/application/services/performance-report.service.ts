import type { Clock } from "@rmsm/core";
import { SystemClock } from "@rmsm/core";
import type { PerformanceMetrics } from "@rmsm/portfolio";
import type { PerformanceReport } from "../../domain/entities/performance-report.entity";
import type { ReportPeriod } from "../../domain/enums/executive-reports.enum";
import { ReportPeriodService } from "./report-period.service";

/** Reads a REAL, unmodified `@rmsm/portfolio` `PerformanceMetrics` (from
 * its own `PerformanceService.computeMetrics()`) — never recomputes win
 * rate, profit factor, Sharpe ratio, or drawdown. */
export class PerformanceReportService {
  constructor(
    private readonly periodService: ReportPeriodService = new ReportPeriodService(),
    private readonly clock: Clock = new SystemClock(),
  ) {}

  generate(portfolioId: string, period: ReportPeriod, metrics: PerformanceMetrics): PerformanceReport {
    const now = this.clock.now();
    const window = this.periodService.windowFor(period, now);
    const narrative = `Performance for ${portfolioId} (${period}): ${metrics.totalTrades} trade(s), realized P&L ${metrics.realizedPnl.toFixed(2)}, win rate ${metrics.winRate.toFixed(0)}%.`;

    return { portfolioId, period, window, metrics, narrative, generatedAt: now };
  }
}
