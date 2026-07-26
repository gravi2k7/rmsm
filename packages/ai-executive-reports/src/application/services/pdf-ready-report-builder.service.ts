import type { Clock } from "@rmsm/core";
import { SystemClock } from "@rmsm/core";
import type { PortfolioReport } from "../../domain/entities/portfolio-report.entity";
import type { RiskReport } from "../../domain/entities/risk-report.entity";
import type { PerformanceReport } from "../../domain/entities/performance-report.entity";
import type { ExecutiveSummary } from "../../domain/entities/executive-summary.entity";
import type { PdfReadyReportModel } from "../../domain/entities/pdf-ready-report-model.entity";

/** Flattens already-generated reports and summary (never recomputed
 * here) into one presentation-agnostic, PDF-ready section list — no PDF
 * library dependency; actual rendering is a future, separate concern. */
export class PdfReadyReportBuilderService {
  constructor(private readonly clock: Clock = new SystemClock()) {}

  build(summary: ExecutiveSummary, portfolioReport: PortfolioReport, riskReport: RiskReport, performanceReport: PerformanceReport): PdfReadyReportModel {
    return {
      title: `Executive Report — ${summary.portfolioId} (${summary.period})`,
      sections: [
        { heading: "Executive Summary", body: `${summary.headline} ${summary.keyPoints.join(" ")}` },
        { heading: "Portfolio Health", body: portfolioReport.narrative },
        { heading: "Risk", body: riskReport.narrative },
        { heading: "Performance", body: performanceReport.narrative },
      ],
      generatedAt: this.clock.now(),
    };
  }
}
