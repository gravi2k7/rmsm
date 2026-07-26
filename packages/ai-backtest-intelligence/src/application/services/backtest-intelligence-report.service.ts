import type { Clock, IdGenerator } from "@rmsm/core";
import { MemoryType } from "@rmsm/ai-memory";
import type { MemoryService, Summarizer } from "@rmsm/ai-memory";
import type { BacktestInterpretation } from "../../domain/entities/backtest-interpretation.entity";
import type { PatternDetectionResult } from "../../domain/entities/trade-pattern.entity";
import type { PerformanceSummary } from "../../domain/entities/performance-summary.entity";
import { OptimizationRecommendationService } from "./optimization-recommendation.service";
import { BacktestExplanationService } from "./backtest-explanation.service";
import type { BacktestIntelligenceReport } from "../../domain/entities/backtest-intelligence-report.entity";
import type { EventPublisher } from "../../events/event-publisher.interface";
import type { BacktestInterpretedEvent } from "../../events/backtest-intelligence-domain-events.interface";

/**
 * The flagship composing service — mirrors every other AI-6xx
 * summary/report service: wires `OptimizationRecommendationService` and
 * `BacktestExplanationService` into one narrative report from already-
 * computed `BacktestInterpretation`/`PatternDetectionResult`/
 * `PerformanceSummary`, never recomputing them. When an AI-203
 * `MemoryService` is injected, every report is ALSO stored as a
 * `MemoryType.SEMANTIC` entry.
 */
export class BacktestIntelligenceReportService {
  constructor(
    private readonly recommendationService: OptimizationRecommendationService,
    private readonly explanationService: BacktestExplanationService,
    private readonly clock: Clock,
    private readonly idGenerator: IdGenerator,
    private readonly eventPublisher?: EventPublisher,
    private readonly summarizer?: Summarizer,
    private readonly memoryService?: MemoryService,
  ) {}

  async generate(
    runId: string,
    interpretation: BacktestInterpretation,
    performanceSummary: PerformanceSummary,
    patterns: PatternDetectionResult,
  ): Promise<BacktestIntelligenceReport> {
    const recommendations = this.recommendationService.recommend(interpretation, patterns);
    const explanation = this.explanationService.explain(runId, interpretation, performanceSummary, patterns);

    const rawNarrative = `${explanation.narrative} Recommendations: ${recommendations.map((r) => r.message).join(" ")}`;
    const narrative = this.summarizer ? await this.summarizer.summarize(rawNarrative, 5) : rawNarrative;

    const now = this.clock.now();
    const report: BacktestIntelligenceReport = { runId, interpretation, patterns, recommendations, narrative, generatedAt: now };

    if (this.memoryService) {
      await this.memoryService.store({
        type: MemoryType.SEMANTIC,
        content: narrative,
        metadata: { tags: ["backtest-intelligence", runId, interpretation.verdict], source: "ai-backtest-intelligence", author: "BacktestIntelligenceReportService" },
      });
    }

    if (this.eventPublisher) {
      const event: BacktestInterpretedEvent = {
        eventId: this.idGenerator.generate(),
        kind: "BacktestInterpreted",
        occurredAt: now,
        aggregateId: runId,
        runId,
        verdict: interpretation.verdict,
      };
      await this.eventPublisher.publish([event]);
    }

    return report;
  }
}
