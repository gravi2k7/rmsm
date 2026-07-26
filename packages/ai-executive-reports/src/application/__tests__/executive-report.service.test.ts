import { describe, expect, it } from "vitest";
import { MemoryService, HeuristicSummarizer, InMemoryMemoryProvider } from "@rmsm/ai-memory";
import { ExecutiveSummaryService } from "../services/executive-summary.service";
import { PdfReadyReportBuilderService } from "../services/pdf-ready-report-builder.service";
import { ExecutiveReportService } from "../services/executive-report.service";
import { buildPortfolioReport, buildRiskReport, buildPerformanceReport, FixedClock, RecordingEventPublisher, SequentialIdGenerator } from "./fakes";

describe("ExecutiveReportService", () => {
  it("composes summary + PDF-ready model on top of three already-generated reports and publishes a domain event", async () => {
    const eventPublisher = new RecordingEventPublisher();
    const service = new ExecutiveReportService(
      new ExecutiveSummaryService(new FixedClock()),
      new PdfReadyReportBuilderService(new FixedClock()),
      new FixedClock(),
      new SequentialIdGenerator(),
      eventPublisher,
    );

    const report = await service.generate(buildPortfolioReport(), buildRiskReport(), buildPerformanceReport());
    expect(report.portfolioId).toBe("p1");
    expect(report.pdfReadyModel.sections).toHaveLength(4);
    expect(eventPublisher.published.some((e) => e.kind === "ExecutiveReportGenerated")).toBe(true);
  });

  it("integrates with a REAL, unmodified @rmsm/ai-memory MemoryService + HeuristicSummarizer: condenses the report narrative and persists it as a retrievable SEMANTIC memory", async () => {
    const memoryRepository = new InMemoryMemoryProvider();
    const memoryService = new MemoryService(memoryRepository);
    const summarizer = new HeuristicSummarizer();

    const service = new ExecutiveReportService(
      new ExecutiveSummaryService(new FixedClock()),
      new PdfReadyReportBuilderService(new FixedClock()),
      new FixedClock(),
      new SequentialIdGenerator(),
      undefined,
      summarizer,
      memoryService,
    );

    const report = await service.generate(
      buildPortfolioReport({ portfolioId: "p-memory-test" }),
      buildRiskReport({ subjectId: "p-memory-test" }),
      buildPerformanceReport({ portfolioId: "p-memory-test" }),
    );

    const result = await memoryRepository.query({ tags: ["executive-reports"] });
    const persisted = result.entries.find((entry) => entry.content === report.summary.headline);

    expect(persisted).toBeDefined();
    expect(persisted?.metadata.tags).toContain("p-memory-test");
    expect(persisted?.metadata.source).toBe("ai-executive-reports");
  });
});
