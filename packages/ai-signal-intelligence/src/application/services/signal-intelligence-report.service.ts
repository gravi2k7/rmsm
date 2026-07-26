import type { Clock, IdGenerator } from "@rmsm/core";
import type { Opportunity } from "@rmsm/opportunity";
import { MemoryType } from "@rmsm/ai-memory";
import type { MemoryService, Summarizer } from "@rmsm/ai-memory";
import { SignalQualityService } from "./signal-quality.service";
import { SignalExplanationService } from "./signal-explanation.service";
import type { SignalIntelligenceReport } from "../../domain/entities/signal-intelligence-report.entity";
import type { EventPublisher } from "../../events/event-publisher.interface";
import type { SignalQualityAssessedEvent } from "../../events/signal-intelligence-domain-events.interface";

/**
 * The flagship composing service — mirrors AI-601's `MarketSummaryService`
 * and AI-602's `StrategyIntelligenceReportService` shape: wires
 * `SignalQualityService` and `SignalExplanationService` into one
 * narrative report, never recomputing their analyses. When an AI-203
 * `MemoryService` is injected, every report is ALSO stored as a
 * `MemoryType.SEMANTIC` entry.
 */
export class SignalIntelligenceReportService {
  constructor(
    private readonly qualityService: SignalQualityService,
    private readonly explanationService: SignalExplanationService,
    private readonly clock: Clock,
    private readonly idGenerator: IdGenerator,
    private readonly eventPublisher?: EventPublisher,
    private readonly summarizer?: Summarizer,
    private readonly memoryService?: MemoryService,
  ) {}

  async generate(opportunity: Opportunity): Promise<SignalIntelligenceReport> {
    const assessment = this.qualityService.assess(opportunity);
    const explanation = this.explanationService.explain(opportunity, assessment);
    const narrative = this.summarizer ? await this.summarizer.summarize(explanation.narrative, 4) : explanation.narrative;

    const now = this.clock.now();
    const report: SignalIntelligenceReport = { opportunityId: opportunity.id, assessment, narrative, generatedAt: now };

    if (this.memoryService) {
      await this.memoryService.store({
        type: MemoryType.SEMANTIC,
        content: narrative,
        metadata: { tags: ["signal-intelligence", opportunity.id, assessment.verdict], source: "ai-signal-intelligence", author: "SignalIntelligenceReportService" },
      });
    }

    if (this.eventPublisher) {
      const event: SignalQualityAssessedEvent = {
        eventId: this.idGenerator.generate(),
        kind: "SignalQualityAssessed",
        occurredAt: now,
        aggregateId: opportunity.id,
        opportunityId: opportunity.id,
        verdict: assessment.verdict,
      };
      await this.eventPublisher.publish([event]);
    }

    return report;
  }
}
