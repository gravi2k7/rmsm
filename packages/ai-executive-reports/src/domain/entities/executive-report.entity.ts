import type { PortfolioReport } from "./portfolio-report.entity";
import type { RiskReport } from "./risk-report.entity";
import type { PerformanceReport } from "./performance-report.entity";
import type { ExecutiveSummary } from "./executive-summary.entity";
import type { PdfReadyReportModel } from "./pdf-ready-report-model.entity";

export interface ExecutiveReport {
  readonly portfolioId: string;
  readonly summary: ExecutiveSummary;
  readonly portfolioReport: PortfolioReport;
  readonly riskReport: RiskReport;
  readonly performanceReport: PerformanceReport;
  readonly pdfReadyModel: PdfReadyReportModel;
  readonly generatedAt: Date;
}
