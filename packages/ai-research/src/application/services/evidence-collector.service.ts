import type { Clock, IdGenerator } from "@rmsm/core";
import type { ResearchPlan } from "../../domain/entities/research-plan.entity";
import type { ResearchStep } from "../../domain/entities/research-step.entity";
import type { Evidence } from "../../domain/entities/evidence.entity";
import { ResearchPlanNotFoundError } from "../../domain/errors/research-domain.errors";
import type { ResearchPlanRepository } from "../../repositories/research-plan-repository.interface";
import type { SearchProvider } from "../../repositories/search-provider.interface";
import { ResearchStepStatus, ResearchPlanStatus } from "../../domain/enums/research.enum";
import type { EventPublisher } from "../../events/event-publisher.interface";
import type { EvidenceCollectedEvent } from "../../events/research-domain-events.interface";

/** Runs every step of a `ResearchPlan` through the injected
 * `SearchProvider`, turning each hit into `Evidence`, and marks each
 * step (and eventually the plan) as completed. A simple, uniform
 * `relevanceScore` of 1 per result is assigned here — real ranking is
 * `EvidenceRankingService`'s job, run afterward over the full
 * collected set. */
export class EvidenceCollector {
  constructor(
    private readonly repository: ResearchPlanRepository,
    private readonly searchProvider: SearchProvider,
    private readonly clock: Clock,
    private readonly idGenerator: IdGenerator,
    private readonly eventPublisher?: EventPublisher,
  ) {}

  async collectForPlan(planId: string): Promise<readonly Evidence[]> {
    const plan = await this.repository.findById(planId);
    if (!plan) {
      throw new ResearchPlanNotFoundError(planId);
    }

    const allEvidence: Evidence[] = [];
    const updatedSteps: ResearchStep[] = [];

    for (const step of plan.steps) {
      const evidence = await this.collectForStep(step);
      allEvidence.push(...evidence);
      updatedSteps.push({ ...step, status: ResearchStepStatus.COMPLETED });

      if (this.eventPublisher) {
        const event: EvidenceCollectedEvent = {
          eventId: this.idGenerator.generate(),
          kind: "EvidenceCollected",
          occurredAt: this.clock.now(),
          aggregateId: planId,
          planId,
          stepId: step.id,
          evidenceCount: evidence.length,
        };
        await this.eventPublisher.publish([event]);
      }
    }

    const updatedPlan: ResearchPlan = { ...plan, status: ResearchPlanStatus.RUNNING, steps: updatedSteps };
    await this.repository.save(updatedPlan);

    return allEvidence;
  }

  private async collectForStep(step: ResearchStep): Promise<readonly Evidence[]> {
    const results = await this.searchProvider.search(step.query);
    return results.map((result) => ({
      id: this.idGenerator.generate(),
      stepId: step.id,
      source: result.source,
      excerpt: result.snippet,
      relevanceScore: 1,
    }));
  }
}
