import type { Clock, IdGenerator } from "@rmsm/core";
import { ResearchPlanStatus, ResearchStepStatus } from "../../domain/enums/research.enum";
import type { ResearchPlan } from "../../domain/entities/research-plan.entity";
import { InvalidResearchQueryError } from "../../domain/errors/research-domain.errors";
import type { ResearchPlanRepository } from "../../repositories/research-plan-repository.interface";
import type { EventPublisher } from "../../events/event-publisher.interface";
import type { ResearchPlanCreatedEvent } from "../../events/research-domain-events.interface";

/** Turns a research topic into a `ResearchPlan` — one `ResearchStep`
 * per sub-question. Splitting is intentionally simple (one step per
 * non-empty line/question the caller supplies) rather than an
 * AI-driven planner: query decomposition strategy is a policy decision
 * for the caller (e.g. AI-301's orchestrator, or a human), not
 * something this package should hard-code. */
export class ResearchPlanner {
  constructor(
    private readonly repository: ResearchPlanRepository,
    private readonly clock: Clock,
    private readonly idGenerator: IdGenerator,
    private readonly eventPublisher?: EventPublisher,
  ) {}

  async createPlan(topic: string, subQueries: readonly string[]): Promise<ResearchPlan> {
    if (!topic.trim()) {
      throw new InvalidResearchQueryError("topic must not be empty");
    }
    const queries = subQueries.filter((q) => q.trim().length > 0);
    if (queries.length === 0) {
      throw new InvalidResearchQueryError("at least one sub-query is required");
    }

    const planId = this.idGenerator.generate();
    const plan: ResearchPlan = {
      id: planId,
      topic,
      status: ResearchPlanStatus.DRAFT,
      steps: queries.map((query) => ({
        id: this.idGenerator.generate(),
        planId,
        query,
        status: ResearchStepStatus.PENDING,
      })),
      createdAt: this.clock.now(),
    };

    await this.repository.save(plan);

    if (this.eventPublisher) {
      const event: ResearchPlanCreatedEvent = {
        eventId: this.idGenerator.generate(),
        kind: "ResearchPlanCreated",
        occurredAt: this.clock.now(),
        aggregateId: planId,
        planId,
        stepCount: plan.steps.length,
      };
      await this.eventPublisher.publish([event]);
    }

    return plan;
  }
}
