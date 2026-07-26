import { describe, expect, it } from "vitest";
import { MemoryService, HeuristicSummarizer, InMemoryMemoryProvider } from "@rmsm/ai-memory";
import { StrategyEvaluationService } from "../services/strategy-evaluation.service";
import { StrategyRiskScoringService } from "../services/strategy-risk-scoring.service";
import { StrategyConfidenceScoringService } from "../services/strategy-confidence-scoring.service";
import { StrategyRecommendationService } from "../services/strategy-recommendation.service";
import { StrategyExplanationService } from "../services/strategy-explanation.service";
import { StrategyIntelligenceReportService } from "../services/strategy-intelligence-report.service";
import { buildStrategy, FixedClock, RecordingEventPublisher, SequentialIdGenerator } from "./fakes";

function buildDeps() {
  return {
    evaluationService: new StrategyEvaluationService(),
    riskScoringService: new StrategyRiskScoringService(),
    confidenceScoringService: new StrategyConfidenceScoringService(),
    recommendationService: new StrategyRecommendationService(),
    explanationService: new StrategyExplanationService(new FixedClock()),
  };
}

describe("StrategyIntelligenceReportService", () => {
  it("composes every other service into one report and publishes domain events", async () => {
    const deps = buildDeps();
    const eventPublisher = new RecordingEventPublisher();
    const service = new StrategyIntelligenceReportService(
      deps.evaluationService,
      deps.riskScoringService,
      deps.confidenceScoringService,
      deps.recommendationService,
      deps.explanationService,
      new FixedClock(),
      new SequentialIdGenerator(),
      eventPublisher,
    );

    const strategy = buildStrategy({ name: "Breakout Hunter", status: "PRODUCTION" });
    const report = await service.generate(strategy);

    expect(report.strategyId).toBe(strategy.id.value);
    expect(report.narrative).toContain("Breakout Hunter");
    expect(report.narrative).toContain(report.recommendation.action);
    expect(eventPublisher.published.some((e) => e.kind === "StrategyEvaluated")).toBe(true);
    expect(eventPublisher.published.some((e) => e.kind === "StrategyRecommendationIssued")).toBe(true);
  });

  it("integrates with a REAL, unmodified @rmsm/ai-memory MemoryService + HeuristicSummarizer: condenses the report narrative and persists it as a retrievable SEMANTIC memory", async () => {
    const deps = buildDeps();
    const memoryRepository = new InMemoryMemoryProvider();
    const memoryService = new MemoryService(memoryRepository);
    const summarizer = new HeuristicSummarizer();

    const service = new StrategyIntelligenceReportService(
      deps.evaluationService,
      deps.riskScoringService,
      deps.confidenceScoringService,
      deps.recommendationService,
      deps.explanationService,
      new FixedClock(),
      new SequentialIdGenerator(),
      undefined,
      summarizer,
      memoryService,
    );

    const strategy = buildStrategy({ name: "Range Scalper", status: "TESTING" });
    const report = await service.generate(strategy);

    const result = await memoryRepository.query({ tags: ["strategy-intelligence"] });
    const persisted = result.entries.find((entry) => entry.content === report.narrative);

    expect(persisted).toBeDefined();
    expect(persisted?.metadata.tags).toContain(strategy.id.value);
    expect(persisted?.metadata.source).toBe("ai-strategy-intelligence");
  });
});
