// AI-609: Executive AI Reports — daily/weekly/monthly reports,
// portfolio/risk/performance reports, executive summaries, NL report
// generation, PDF-ready report models. Reads REAL
// @rmsm/ai-portfolio-intelligence (AI-604) PortfolioHealth/
// DiversificationAnalysis, REAL @rmsm/ai-risk-intelligence (AI-605)
// RiskAnalysis/DrawdownAnalysis/RiskAlert, and REAL @rmsm/portfolio
// PerformanceMetrics — never recomputes any of them, only frames and
// composes. Integrates with AI-203 (@rmsm/ai-memory) for insight
// storage/summarization. No PDF library dependency: PdfReadyReportModel
// is a structured, presentation-agnostic shape real PDF-rendering
// infrastructure (implemented entirely outside this package) can render.

export { ReportPeriod, REPORT_PERIODS } from "./domain/enums/executive-reports.enum";

export type { ReportWindow } from "./domain/entities/report-window.entity";
export type { PortfolioReport } from "./domain/entities/portfolio-report.entity";
export type { RiskReport } from "./domain/entities/risk-report.entity";
export type { PerformanceReport } from "./domain/entities/performance-report.entity";
export type { ExecutiveSummary } from "./domain/entities/executive-summary.entity";
export type { PdfReadyReportModel, ReportSection } from "./domain/entities/pdf-ready-report-model.entity";
export type { ExecutiveReport } from "./domain/entities/executive-report.entity";

export { InvalidReportPeriodError } from "./domain/errors/executive-reports-domain.errors";

export type { ExecutiveReportsDomainEvent, ExecutiveReportGeneratedEvent } from "./events/executive-reports-domain-events.interface";
export type { EventPublisher } from "./events/event-publisher.interface";

export { ReportPeriodService } from "./application/services/report-period.service";
export { PortfolioReportService } from "./application/services/portfolio-report.service";
export { RiskReportService } from "./application/services/risk-report.service";
export { PerformanceReportService } from "./application/services/performance-report.service";
export { ExecutiveSummaryService } from "./application/services/executive-summary.service";
export { PdfReadyReportBuilderService } from "./application/services/pdf-ready-report-builder.service";
export { ExecutiveReportService } from "./application/services/executive-report.service";

export { InMemoryEventPublisher, type ExecutiveReportsEventListener } from "./infrastructure/in-memory-event-publisher";
