import type { IdGenerator, Clock } from "@rmsm/core";
import type { Summarizer } from "@rmsm/ai-memory";
import type { Evidence } from "../../domain/entities/evidence.entity";
import type { Citation } from "../../domain/entities/citation.entity";
import type { ResearchReport } from "../../domain/entities/research-report.entity";
import { EvidenceRankingService } from "./evidence-ranking.service";
import type { EventPublisher } from "../../events/event-publisher.interface";
import type { ResearchSummarizedEvent, ResearchCompletedEvent } from "../../events/research-domain-events.interface";

/**
 * Builds the final `ResearchReport`: ranks evidence, summarizes the
 * combined excerpts using an injected `Summarizer` — deliberately
 * `@rmsm/ai-memory`'s own port/`HeuristicSummarizer`, reused rather
 * than rebuilt (per "no duplicated logic", the same call AI-302 made) —
 * and produces one `Citation` per cited `Evidence`.
 */
export class ResearchReportBuilder {
  constructor(
    private readonly summarizer: Summarizer,
    private readonly ranker: EvidenceRankingService,
    private readonly clock: Clock,
    private readonly idGenerator: IdGenerator,
    private readonly eventPublisher?: EventPublisher,
  ) {}

  async build(planId: string, evidence: readonly Evidence[]): Promise<ResearchReport> {
    const ranked = this.ranker.rank(evidence);
    const combinedExcerpts = ranked.map((item) => item.excerpt).join(" ");
    const summary = await this.summarizer.summarize(combinedExcerpts);

    if (this.eventPublisher) {
      const summarized: ResearchSummarizedEvent = {
        eventId: this.idGenerator.generate(),
        kind: "ResearchSummarized",
        occurredAt: this.clock.now(),
        aggregateId: planId,
        planId,
      };
      await this.eventPublisher.publish([summarized]);
    }

    const citations: Citation[] = ranked.map((item) => ({
      evidenceId: item.id,
      label: item.source.title,
      locator: item.source.url ?? item.source.id,
    }));

    if (this.eventPublisher) {
      const completed: ResearchCompletedEvent = {
        eventId: this.idGenerator.generate(),
        kind: "ResearchCompleted",
        occurredAt: this.clock.now(),
        aggregateId: planId,
        planId,
        citationCount: citations.length,
      };
      await this.eventPublisher.publish([completed]);
    }

    return { planId, summary, citations };
  }
}
