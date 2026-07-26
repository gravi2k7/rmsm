import { describe, expect, it } from "vitest";
import { MemoryService, HeuristicSummarizer, InMemoryMemoryProvider } from "@rmsm/ai-memory";
import { OptimizationRecommendationService } from "../services/optimization-recommendation.service";
import { BacktestExplanationService } from "../services/backtest-explanation.service";
import { BacktestIntelligenceReportService } from "../services/backtest-intelligence-report.service";
import { BacktestVerdict } from "../../domain/enums/backtest-intelligence.enum";
import { FixedClock, RecordingEventPublisher, SequentialIdGenerator } from "./fakes";

const interpretation = { runId: "run-1", verdict: BacktestVerdict.STRONG, reasons: ["Profit factor 2.00, win rate 66%."] };
const performanceSummary = { runId: "run-1", narrative: "3 trade(s). Win rate 66%. Profit factor 2.00." };
const patterns = { runId: "run-1", patterns: [] };

describe("BacktestIntelligenceReportService", () => {
  it("composes recommendations + explanation into one narrative and publishes a domain event", async () => {
    const eventPublisher = new RecordingEventPublisher();
    const service = new BacktestIntelligenceReportService(new OptimizationRecommendationService(), new BacktestExplanationService(), new FixedClock(), new SequentialIdGenerator(), eventPublisher);

    const report = await service.generate("run-1", interpretation, performanceSummary, patterns);
    expect(report.runId).toBe("run-1");
    expect(report.narrative).toContain("STRONG");
    expect(eventPublisher.published.some((e) => e.kind === "BacktestInterpreted")).toBe(true);
  });

  it("integrates with a REAL, unmodified @rmsm/ai-memory MemoryService + HeuristicSummarizer: condenses the report narrative and persists it as a retrievable SEMANTIC memory", async () => {
    const memoryRepository = new InMemoryMemoryProvider();
    const memoryService = new MemoryService(memoryRepository);
    const summarizer = new HeuristicSummarizer();

    const service = new BacktestIntelligenceReportService(
      new OptimizationRecommendationService(),
      new BacktestExplanationService(),
      new FixedClock(),
      new SequentialIdGenerator(),
      undefined,
      summarizer,
      memoryService,
    );

    const report = await service.generate("run-memory-test", { ...interpretation, runId: "run-memory-test" }, performanceSummary, patterns);

    const result = await memoryRepository.query({ tags: ["backtest-intelligence"] });
    const persisted = result.entries.find((entry) => entry.content === report.narrative);

    expect(persisted).toBeDefined();
    expect(persisted?.metadata.tags).toContain("run-memory-test");
    expect(persisted?.metadata.source).toBe("ai-backtest-intelligence");
  });
});
