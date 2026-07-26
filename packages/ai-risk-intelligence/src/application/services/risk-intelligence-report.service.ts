import type { Clock, IdGenerator } from "@rmsm/core";
import { MemoryType } from "@rmsm/ai-memory";
import type { MemoryService, Summarizer } from "@rmsm/ai-memory";
import type { RiskAnalysis } from "../../domain/entities/risk-analysis.entity";
import type { DrawdownAnalysis } from "../../domain/entities/drawdown-analysis.entity";
import { RiskAlertService } from "./risk-alert.service";
import { RiskRecommendationService } from "./risk-recommendation.service";
import type { ExposureMonitoringResult } from "../../domain/entities/exposure-monitoring-result.entity";
import type { RiskIntelligenceReport } from "../../domain/entities/risk-intelligence-report.entity";
import type { EventPublisher } from "../../events/event-publisher.interface";
import type { RiskAnalyzedEvent, RiskAlertRaisedEvent } from "../../events/risk-intelligence-domain-events.interface";

/**
 * The flagship composing service — mirrors AI-601/602/603/604's own
 * summary/report services: wires `RiskAnalysis`, `DrawdownAnalysis`,
 * `RiskAlertService`, and `RiskRecommendationService` into one
 * narrative report, never recomputing any of their inputs. When an
 * AI-203 `MemoryService` is injected, every report is ALSO stored as a
 * `MemoryType.SEMANTIC` entry — "AI insights must be traceable" held
 * for every AI-6xx package built so far.
 */
export class RiskIntelligenceReportService {
  constructor(
    private readonly alertService: RiskAlertService,
    private readonly recommendationService: RiskRecommendationService,
    private readonly clock: Clock,
    private readonly idGenerator: IdGenerator,
    private readonly eventPublisher?: EventPublisher,
    private readonly summarizer?: Summarizer,
    private readonly memoryService?: MemoryService,
  ) {}

  async generate(subjectId: string, riskAnalysis: RiskAnalysis, drawdown: DrawdownAnalysis, exposure: ExposureMonitoringResult): Promise<RiskIntelligenceReport> {
    const alerts = this.alertService.evaluate(riskAnalysis, drawdown, exposure);
    const recommendation = this.recommendationService.recommend(subjectId, riskAnalysis, drawdown, exposure);

    const rawNarrative = [
      `Risk verdict for ${subjectId} is ${riskAnalysis.verdict} (score ${riskAnalysis.overallScore}/100).`,
      drawdown.reason,
      alerts.length > 0 ? `Active alerts: ${alerts.map((a) => `${a.severity} ${a.code}`).join(", ")}.` : "No active risk alerts.",
      `Recommendation: ${recommendation.action} — ${recommendation.rationale}`,
    ].join(" ");

    const narrative = this.summarizer ? await this.summarizer.summarize(rawNarrative, 4) : rawNarrative;
    const now = this.clock.now();

    const report: RiskIntelligenceReport = { subjectId, riskAnalysis, drawdownAnalysis: drawdown, alerts, recommendation, narrative, generatedAt: now };

    if (this.memoryService) {
      await this.memoryService.store({
        type: MemoryType.SEMANTIC,
        content: narrative,
        metadata: { tags: ["risk-intelligence", subjectId, riskAnalysis.verdict], source: "ai-risk-intelligence", author: "RiskIntelligenceReportService" },
      });
    }

    await this.publishForReport(subjectId, riskAnalysis, alerts, now);
    return report;
  }

  private async publishForReport(
    subjectId: string,
    riskAnalysis: RiskAnalysis,
    alerts: RiskIntelligenceReport["alerts"],
    occurredAt: Date,
  ): Promise<void> {
    if (!this.eventPublisher) return;

    const events: (RiskAnalyzedEvent | RiskAlertRaisedEvent)[] = [
      { eventId: this.idGenerator.generate(), kind: "RiskAnalyzed", occurredAt, aggregateId: subjectId, subjectId, verdict: riskAnalysis.verdict },
    ];
    for (const alert of alerts) {
      events.push({ eventId: this.idGenerator.generate(), kind: "RiskAlertRaised", occurredAt, aggregateId: subjectId, subjectId, severity: alert.severity, code: alert.code });
    }
    await this.eventPublisher.publish(events);
  }
}
