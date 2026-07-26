import type { Clock, IdGenerator } from "@rmsm/core";
import type { EventPublisher } from "../../events/event-publisher.interface";
import type { ExecutiveReportsDomainEvent } from "../../events/executive-reports-domain-events.interface";

export class FixedClock implements Clock {
  constructor(private current: Date = new Date("2026-01-08T00:00:00.000Z")) {}
  now(): Date {
    return this.current;
  }
}

export class SequentialIdGenerator implements IdGenerator {
  private counter = 0;
  generate(): string {
    this.counter += 1;
    return `id-${this.counter}`;
  }
}

export class RecordingEventPublisher implements EventPublisher {
  public readonly published: ExecutiveReportsDomainEvent[] = [];
  async publish(events: readonly ExecutiveReportsDomainEvent[]): Promise<void> {
    this.published.push(...events);
  }
}

import { PerformanceService } from "@rmsm/portfolio";
import { PortfolioHealthVerdict, DiversificationLevel } from "@rmsm/ai-portfolio-intelligence";
import type { PortfolioReport } from "../../domain/entities/portfolio-report.entity";
import type { RiskReport } from "../../domain/entities/risk-report.entity";
import type { PerformanceReport } from "../../domain/entities/performance-report.entity";
import { RiskVerdict } from "@rmsm/ai-risk-intelligence";
import { ReportPeriod } from "../../domain/enums/executive-reports.enum";

const WINDOW = { start: new Date("2026-01-01"), end: new Date("2026-01-08") };

export function buildPortfolioReport(overrides: Partial<PortfolioReport> = {}): PortfolioReport {
  return {
    portfolioId: "p1",
    period: ReportPeriod.WEEKLY,
    window: WINDOW,
    health: { portfolioId: "p1", verdict: PortfolioHealthVerdict.HEALTHY, reasons: ["All health checks passed."] },
    diversification: { portfolioId: "p1", level: DiversificationLevel.WELL_DIVERSIFIED, herfindahlIndex: 0.1, reason: "Exposure is spread broadly across symbols." },
    narrative: "Portfolio p1 (WEEKLY): health is HEALTHY, diversification is WELL_DIVERSIFIED.",
    generatedAt: new Date("2026-01-08"),
    ...overrides,
  };
}

export function buildRiskReport(overrides: Partial<RiskReport> = {}): RiskReport {
  return {
    subjectId: "p1",
    period: ReportPeriod.WEEKLY,
    window: WINDOW,
    riskAnalysis: { subjectId: "p1", verdict: RiskVerdict.ACCEPTABLE, overallScore: 10, reasons: [] },
    drawdown: { portfolioId: "p1", currentDrawdownPercentage: 2, historicalMaxDrawdownPercentage: 5, verdict: RiskVerdict.ACCEPTABLE, reason: "Current drawdown is within normal range." },
    alerts: [],
    narrative: "Risk for p1 (WEEKLY): ACCEPTABLE, drawdown ACCEPTABLE. 0 active alert(s).",
    generatedAt: new Date("2026-01-08"),
    ...overrides,
  };
}

export function buildPerformanceReport(overrides: Partial<PerformanceReport> = {}): PerformanceReport {
  return {
    portfolioId: "p1",
    period: ReportPeriod.WEEKLY,
    window: WINDOW,
    metrics: new PerformanceService().computeMetrics([], []),
    narrative: "Performance for p1 (WEEKLY): 0 trade(s), realized P&L 0.00, win rate 0%.",
    generatedAt: new Date("2026-01-08"),
    ...overrides,
  };
}
