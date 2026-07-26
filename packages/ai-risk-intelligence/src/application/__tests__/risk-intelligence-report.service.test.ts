import { describe, expect, it } from "vitest";
import { MemoryService, HeuristicSummarizer, InMemoryMemoryProvider } from "@rmsm/ai-memory";
import { RiskAlertService } from "../services/risk-alert.service";
import { RiskRecommendationService } from "../services/risk-recommendation.service";
import { RiskIntelligenceReportService } from "../services/risk-intelligence-report.service";
import { RiskVerdict } from "../../domain/enums/risk-intelligence.enum";
import { FixedClock, RecordingEventPublisher, SequentialIdGenerator } from "./fakes";

const riskAnalysis = { subjectId: "s1", verdict: RiskVerdict.ELEVATED, overallScore: 55, reasons: ["All risk checks passed (score 55/100)."] };
const drawdown = { portfolioId: "p1", currentDrawdownPercentage: 12, historicalMaxDrawdownPercentage: 15, verdict: RiskVerdict.ELEVATED, reason: "Current drawdown of 12.0% from peak equity is elevated." };
const exposure = { portfolioId: "p1", exposures: [], anyBreached: false };

describe("RiskIntelligenceReportService", () => {
  it("composes alerts + recommendation into one narrative report and publishes domain events", async () => {
    const eventPublisher = new RecordingEventPublisher();
    const service = new RiskIntelligenceReportService(new RiskAlertService(), new RiskRecommendationService(), new FixedClock(), new SequentialIdGenerator(), eventPublisher);

    const report = await service.generate("s1", riskAnalysis, drawdown, exposure);
    expect(report.subjectId).toBe("s1");
    expect(report.narrative).toContain("ELEVATED");
    expect(eventPublisher.published.some((e) => e.kind === "RiskAnalyzed")).toBe(true);
  });

  it("integrates with a REAL, unmodified @rmsm/ai-memory MemoryService + HeuristicSummarizer: condenses the report narrative and persists it as a retrievable SEMANTIC memory", async () => {
    const memoryRepository = new InMemoryMemoryProvider();
    const memoryService = new MemoryService(memoryRepository);
    const summarizer = new HeuristicSummarizer();

    const service = new RiskIntelligenceReportService(
      new RiskAlertService(),
      new RiskRecommendationService(),
      new FixedClock(),
      new SequentialIdGenerator(),
      undefined,
      summarizer,
      memoryService,
    );

    const report = await service.generate("s1-memory-test", { ...riskAnalysis, subjectId: "s1-memory-test" }, drawdown, exposure);

    const result = await memoryRepository.query({ tags: ["risk-intelligence"] });
    const persisted = result.entries.find((entry) => entry.content === report.narrative);

    expect(persisted).toBeDefined();
    expect(persisted?.metadata.tags).toContain("s1-memory-test");
    expect(persisted?.metadata.source).toBe("ai-risk-intelligence");
  });
});
