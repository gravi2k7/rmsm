import type { ReportWindow } from "../../domain/entities/report-window.entity";
import { ReportPeriod } from "../../domain/enums/executive-reports.enum";
import { InvalidReportPeriodError } from "../../domain/errors/executive-reports-domain.errors";

const PERIOD_MS: Readonly<Record<ReportPeriod, number>> = {
  [ReportPeriod.DAILY]: 24 * 60 * 60 * 1000,
  [ReportPeriod.WEEKLY]: 7 * 24 * 60 * 60 * 1000,
  [ReportPeriod.MONTHLY]: 30 * 24 * 60 * 60 * 1000,
};

/** Pure date-window math for "daily/weekly/monthly reports" — no
 * scheduler, no cron, no real recurring-job infrastructure (a future,
 * separate concern); this only answers "what window does a report of
 * this cadence, as of this instant, cover." */
export class ReportPeriodService {
  windowFor(period: ReportPeriod, asOf: Date): ReportWindow {
    const durationMs = PERIOD_MS[period];
    if (durationMs === undefined) throw new InvalidReportPeriodError(period);
    return { start: new Date(asOf.getTime() - durationMs), end: asOf };
  }
}
