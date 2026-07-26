import type { Clock, IdGenerator } from "@rmsm/core";
import type { Candle, SymbolCode } from "@rmsm/market";
import { MemoryType } from "@rmsm/ai-memory";
import type { MemoryService, Summarizer } from "@rmsm/ai-memory";
import { MarketAnalysisService } from "./market-analysis.service";
import { MarketRegimeService } from "./market-regime.service";
import { MarketScoringService } from "./market-scoring.service";
import { MarketAlertService } from "./market-alert.service";
import type { MarketSummary } from "../../domain/entities/market-summary.entity";
import type { EventPublisher } from "../../events/event-publisher.interface";
import type { MarketSummaryGeneratedEvent, RegimeDetectedEvent, MarketAlertRaisedEvent } from "../../events/market-intelligence-domain-events.interface";

/**
 * The "market summary generation" and "market explanation" capabilities:
 * composes every other service in this package into one narrative
 * `MarketSummary`, never recomputing any of their analyses itself. When
 * an AI-203 `MemoryService` is injected, every generated summary is ALSO
 * stored as a `MemoryType.SEMANTIC` entry — "AI insights must be
 * traceable" made concrete: a caller can later retrieve why this
 * package said what it said, through AI-203's own real, unmodified
 * retrieval path. When an AI-203 `Summarizer` is injected, the raw
 * narrative is condensed through it rather than returned verbatim —
 * genuine reuse of AI-203's summarization capability for "AI Memory"
 * integration, not a re-implementation of text summarization here.
 */
export class MarketSummaryService {
  constructor(
    private readonly marketAnalysis: MarketAnalysisService,
    private readonly regimeService: MarketRegimeService,
    private readonly scoringService: MarketScoringService,
    private readonly alertService: MarketAlertService,
    private readonly clock: Clock,
    private readonly idGenerator: IdGenerator,
    private readonly eventPublisher?: EventPublisher,
    private readonly summarizer?: Summarizer,
    private readonly memoryService?: MemoryService,
  ) {}

  async generate(symbolCode: SymbolCode, candles: readonly Candle[]): Promise<MarketSummary> {
    const trend = this.marketAnalysis.analyzeTrend(candles);
    const volatility = this.marketAnalysis.analyzeVolatility(candles);
    const regime = this.regimeService.detect(candles);
    const score = this.scoringService.score(candles);
    const alerts = this.alertService.evaluate(candles);

    const rawNarrative = this.buildNarrative(symbolCode, trend, volatility, regime, score, alerts);
    const narrative = this.summarizer ? await this.summarizer.summarize(rawNarrative, 3) : rawNarrative;

    const now = this.clock.now();
    const summary: MarketSummary = { symbolCode: symbolCode.value, narrative, regime, trend, volatility, score, alerts, generatedAt: now };

    if (this.memoryService) {
      await this.memoryService.store({
        type: MemoryType.SEMANTIC,
        content: narrative,
        metadata: { tags: ["market-intelligence", symbolCode.value, regime.regime], source: "ai-market-intelligence", author: "MarketSummaryService" },
      });
    }

    await this.publishForSummary(symbolCode, regime, alerts, now);
    return summary;
  }

  private buildNarrative(
    symbolCode: SymbolCode,
    trend: MarketSummary["trend"],
    volatility: MarketSummary["volatility"],
    regime: MarketSummary["regime"],
    score: MarketSummary["score"],
    alerts: MarketSummary["alerts"],
  ): string {
    const parts = [
      `${symbolCode.value} is currently in a ${regime.regime} regime (${(regime.confidence * 100).toFixed(0)}% confidence): ${regime.reason}`,
      `Trend is ${trend.direction} with strength ${(trend.strength * 100).toFixed(0)}%.`,
      `Volatility is ${volatility.level} (return stddev ${volatility.returnStdDev.toFixed(4)}).`,
      `Overall market score is ${score.overall.toFixed(0)}/100.`,
    ];
    if (alerts.length > 0) {
      parts.push(`Active alerts: ${alerts.map((a) => `${a.severity} ${a.code}`).join(", ")}.`);
    }
    return parts.join(" ");
  }

  private async publishForSummary(
    symbolCode: SymbolCode,
    regime: MarketSummary["regime"],
    alerts: MarketSummary["alerts"],
    occurredAt: Date,
  ): Promise<void> {
    if (!this.eventPublisher) return;

    const events: (MarketSummaryGeneratedEvent | RegimeDetectedEvent | MarketAlertRaisedEvent)[] = [
      { eventId: this.idGenerator.generate(), kind: "MarketSummaryGenerated", occurredAt, aggregateId: symbolCode.value, symbolCode: symbolCode.value },
      {
        eventId: this.idGenerator.generate(),
        kind: "RegimeDetected",
        occurredAt,
        aggregateId: symbolCode.value,
        symbolCode: symbolCode.value,
        regime: regime.regime,
      },
    ];
    for (const alert of alerts) {
      events.push({
        eventId: this.idGenerator.generate(),
        kind: "MarketAlertRaised",
        occurredAt,
        aggregateId: symbolCode.value,
        symbolCode: symbolCode.value,
        severity: alert.severity,
        code: alert.code,
      });
    }
    await this.eventPublisher.publish(events);
  }
}
