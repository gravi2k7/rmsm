import { describe, expect, it } from "vitest";
import { ExecutiveSummaryService } from "../services/executive-summary.service";
import { PdfReadyReportBuilderService } from "../services/pdf-ready-report-builder.service";
import { buildPortfolioReport, buildRiskReport, buildPerformanceReport, FixedClock } from "./fakes";

describe("PdfReadyReportBuilderService", () => {
  it("flattens summary + three reports into presentation-agnostic sections, without a PDF library", () => {
    const portfolioReport = buildPortfolioReport();
    const riskReport = buildRiskReport();
    const performanceReport = buildPerformanceReport();
    const summary = new ExecutiveSummaryService(new FixedClock()).summarize(portfolioReport, riskReport, performanceReport);

    const model = new PdfReadyReportBuilderService(new FixedClock()).build(summary, portfolioReport, riskReport, performanceReport);

    expect(model.sections.map((s) => s.heading)).toEqual(["Executive Summary", "Portfolio Health", "Risk", "Performance"]);
    expect(model.title).toContain("p1");
  });
});
