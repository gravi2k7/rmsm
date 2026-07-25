import type { Clock, IdGenerator } from "@rmsm/core";
import type { ManualInterventionRepository } from "../../repositories/manual-intervention-repository.interface";
import type { DecisionRecordRepository } from "../../repositories/decision-record-repository.interface";
import type { ManualIntervention } from "../../domain/entities/manual-intervention.entity";
import { InterventionStatus } from "../../domain/enums/hitl.enum";
import { InterventionNotFoundError, InterventionAlreadyResolvedError } from "../../domain/errors/hitl-domain.errors";
import type { EventPublisher } from "../../events/event-publisher.interface";
import type { InterventionRequestedEvent, InterventionResolvedEvent, DecisionRecordedEvent } from "../../events/hitl-domain-events.interface";

/** The "manual intervention" capability, plus its own contribution to
 * "decision recording": resolving an intervention writes a
 * `DecisionRecord` too, the same as `ApprovalService`'s resolutions
 * do, so both flows land in the same audit trail. */
export class InterventionService {
  constructor(
    private readonly interventionRepository: ManualInterventionRepository,
    private readonly decisionRepository: DecisionRecordRepository,
    private readonly clock: Clock,
    private readonly idGenerator: IdGenerator,
    private readonly eventPublisher?: EventPublisher,
  ) {}

  async requestIntervention(agentId: string, reason: string, executionId?: string): Promise<ManualIntervention> {
    const now = this.clock.now();
    const intervention: ManualIntervention = {
      id: this.idGenerator.generate(),
      agentId,
      executionId,
      reason,
      status: InterventionStatus.REQUESTED,
      requestedAt: now,
      resolvedAt: null,
    };
    await this.interventionRepository.save(intervention);

    const event: InterventionRequestedEvent = {
      eventId: this.idGenerator.generate(),
      kind: "InterventionRequested",
      occurredAt: now,
      aggregateId: intervention.id,
      interventionId: intervention.id,
      agentId,
    };
    await this.publish([event]);

    return intervention;
  }

  async resolveIntervention(interventionId: string, resolvedBy: string, resolution: string): Promise<ManualIntervention> {
    const intervention = await this.getIntervention(interventionId);
    if (intervention.status === InterventionStatus.RESOLVED) {
      throw new InterventionAlreadyResolvedError(interventionId);
    }

    const now = this.clock.now();
    const resolved: ManualIntervention = { ...intervention, status: InterventionStatus.RESOLVED, resolution, resolvedAt: now };
    await this.interventionRepository.save(resolved);

    const recordId = this.idGenerator.generate();
    await this.decisionRepository.save({
      id: recordId,
      subjectType: "INTERVENTION",
      subjectId: interventionId,
      decision: "RESOLVED",
      decidedBy: resolvedBy,
      reason: resolution,
      decidedAt: now,
    });
    const decisionEvent: DecisionRecordedEvent = {
      eventId: this.idGenerator.generate(),
      kind: "DecisionRecorded",
      occurredAt: now,
      aggregateId: recordId,
      recordId,
      subjectId: interventionId,
    };

    const resolvedEvent: InterventionResolvedEvent = {
      eventId: this.idGenerator.generate(),
      kind: "InterventionResolved",
      occurredAt: now,
      aggregateId: interventionId,
      interventionId,
    };
    await this.publish([resolvedEvent, decisionEvent]);

    return resolved;
  }

  async getIntervention(interventionId: string): Promise<ManualIntervention> {
    const intervention = await this.interventionRepository.findById(interventionId);
    if (!intervention) {
      throw new InterventionNotFoundError(interventionId);
    }
    return intervention;
  }

  private async publish(events: readonly (InterventionRequestedEvent | InterventionResolvedEvent | DecisionRecordedEvent)[]): Promise<void> {
    if (this.eventPublisher) {
      await this.eventPublisher.publish(events);
    }
  }
}
