import type { Clock, IdGenerator } from "@rmsm/core";
import { MemoryType } from "@rmsm/ai-memory";
import type { MemoryService, Summarizer } from "@rmsm/ai-memory";
import type { PortfolioReport } from "../../domain/entities/portfolio-report.entity";
import type { RiskReport } from "../../domain/entities/risk-report.entity";
import type { PerformanceReport } from "../../domain/entities/performance-report.entity";
import { ExecutiveSummaryService } from "./executive-summary.service";
import { PdfReadyReportBuilderService } from "./pdf-ready-report-builder.service";
import type { ExecutiveReport } from "../../domain/entities/executive-report.entity";
import type { EventPublisher } from "../../events/event-publisher.interface";
import type { ExecutiveReportGeneratedEvent } from "../../events/executive-reports-domain-events.interface";

/**
 * The flagship composing service — mirrors every other AI-6xx
 * summary/report service: wires `ExecutiveSummaryService` and
 * `PdfReadyReportBuilderService` on top of three already-generated
 * reports (each reading REAL AI-604/AI-605/@rmsm/portfolio data), never
 * recomputing any of them. When an AI-203 `MemoryService` is injected,
 * every executive report is ALSO stored as a `MemoryType.SEMANTIC`
 * entry.
 */
export class ExecutiveReportService {
  constructor(
    private readonly summaryService: ExecutiveSummaryService,
    private readonly pdfBuilder: PdfReadyReportBuilderService,
    private readonly clock: Clock,
    private readonly idGenerator: IdGenerator,
    private readonly eventPublisher?: EventPublisher,
    private readonly summarizer?: Summarizer,
    private readonly memoryService?: MemoryService,
  ) {}

  async generate(portfolioReport: PortfolioReport, riskReport: RiskReport, performanceReport: PerformanceReport): Promise<ExecutiveReport> {
    const summary = this.summaryService.summarize(portfolioReport, riskReport, performanceReport);
    const pdfReadyModel = this.pdfBuilder.build(summary, portfolioReport, riskReport, performanceReport);

    const rawNarrative = `${summary.headline} ${summary.keyPoints.join(" ")}`;
    const narrative = this.summarizer ? await this.summarizer.summarize(rawNarrative, 4) : rawNarrative;

    const now = this.clock.now();
    const report: ExecutiveReport = {
      portfolioId: portfolioReport.portfolioId,
      summary: { ...summary, headline: narrative },
      portfolioReport,
      riskReport,
      performanceReport,
      pdfReadyModel,
      generatedAt: now,
    };

    if (this.memoryService) {
      await this.memoryService.store({
        type: MemoryType.SEMANTIC,
        content: narrative,
        metadata: { tags: ["executive-reports", portfolioReport.portfolioId, portfolioReport.period], source: "ai-executive-reports", author: "ExecutiveReportService" },
      });
    }

    if (this.eventPublisher) {
      const event: ExecutiveReportGeneratedEvent = {
        eventId: this.idGenerator.generate(),
        kind: "ExecutiveReportGenerated",
        occurredAt: now,
        aggregateId: portfolioReport.portfolioId,
        portfolioId: portfolioReport.portfolioId,
        period: portfolioReport.period,
      };
      await this.eventPublisher.publish([event]);
    }

    return report;
  }
}
