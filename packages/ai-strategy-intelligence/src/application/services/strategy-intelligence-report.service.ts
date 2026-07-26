import type { Clock, IdGenerator } from "@rmsm/core";
import type { Strategy } from "@rmsm/strategy";
import { MemoryType } from "@rmsm/ai-memory";
import type { MemoryService, Summarizer } from "@rmsm/ai-memory";
import { StrategyEvaluationService } from "./strategy-evaluation.service";
import { StrategyRiskScoringService } from "./strategy-risk-scoring.service";
import { StrategyConfidenceScoringService } from "./strategy-confidence-scoring.service";
import { StrategyRecommendationService } from "./strategy-recommendation.service";
import { StrategyExplanationService } from "./strategy-explanation.service";
import type { StrategyIntelligenceReport } from "../../domain/entities/strategy-intelligence-report.entity";
import type { EventPublisher } from "../../events/event-publisher.interface";
import type { StrategyEvaluatedEvent, StrategyRecommendationIssuedEvent } from "../../events/strategy-intelligence-domain-events.interface";

/**
 * The flagship composing service — mirrors AI-601's own
 * `MarketSummaryService` shape exactly: wires every other service in
 * this package into one `StrategyIntelligenceReport`, never
 * recomputing any of their analyses itself. When an AI-203
 * `MemoryService` is injected, every generated report is ALSO stored as
 * a `MemoryType.SEMANTIC` entry, so "AI insights must be traceable"
 * holds for AI-602 exactly as it does for AI-601.
 */
export class StrategyIntelligenceReportService {
  constructor(
    private readonly evaluationService: StrategyEvaluationService,
    private readonly riskScoringService: StrategyRiskScoringService,
    private readonly confidenceScoringService: StrategyConfidenceScoringService,
    private readonly recommendationService: StrategyRecommendationService,
    private readonly explanationService: StrategyExplanationService,
    private readonly clock: Clock,
    private readonly idGenerator: IdGenerator,
    private readonly eventPublisher?: EventPublisher,
    private readonly summarizer?: Summarizer,
    private readonly memoryService?: MemoryService,
  ) {}

  async generate(strategy: Strategy): Promise<StrategyIntelligenceReport> {
    const evaluation = this.evaluationService.evaluate(strategy);
    const riskScore = this.riskScoringService.score(strategy);
    const confidence = this.confidenceScoringService.score(strategy, evaluation);
    const recommendation = this.recommendationService.recommend(strategy, evaluation, riskScore);
    const explanation = this.explanationService.explain(strategy, evaluation, riskScore, confidence);

    const rawNarrative = `${explanation.narrative} Recommendation: ${recommendation.action} — ${recommendation.rationale}`;
    const narrative = this.summarizer ? await this.summarizer.summarize(rawNarrative, 4) : rawNarrative;

    const now = this.clock.now();
    const report: StrategyIntelligenceReport = { strategyId: strategy.id.value, evaluation, riskScore, confidence, recommendation, narrative, generatedAt: now };

    if (this.memoryService) {
      await this.memoryService.store({
        type: MemoryType.SEMANTIC,
        content: narrative,
        metadata: { tags: ["strategy-intelligence", strategy.id.value, evaluation.verdict], source: "ai-strategy-intelligence", author: "StrategyIntelligenceReportService" },
      });
    }

    await this.publishForReport(strategy, evaluation, recommendation, now);
    return report;
  }

  private async publishForReport(
    strategy: Strategy,
    evaluation: StrategyIntelligenceReport["evaluation"],
    recommendation: StrategyIntelligenceReport["recommendation"],
    occurredAt: Date,
  ): Promise<void> {
    if (!this.eventPublisher) return;
    const events: (StrategyEvaluatedEvent | StrategyRecommendationIssuedEvent)[] = [
      {
        eventId: this.idGenerator.generate(),
        kind: "StrategyEvaluated",
        occurredAt,
        aggregateId: strategy.id.value,
        strategyId: strategy.id.value,
        verdict: evaluation.verdict,
      },
      {
        eventId: this.idGenerator.generate(),
        kind: "StrategyRecommendationIssued",
        occurredAt,
        aggregateId: strategy.id.value,
        strategyId: strategy.id.value,
        action: recommendation.action,
      },
    ];
    await this.eventPublisher.publish(events);
  }
}
