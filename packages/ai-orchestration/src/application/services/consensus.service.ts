import type { Clock, IdGenerator } from "@rmsm/core";
import type { ConsensusStrategy } from "../../repositories/consensus-strategy.interface";
import type { ConsensusResult } from "../../domain/entities/consensus.entity";
import type { EventPublisher } from "../../events/event-publisher.interface";
import type { ConsensusReachedEvent } from "../../events/orchestration-domain-events.interface";

/** The "consensus abstraction" capability: given a proposal and each
 * voting agent's vote, delegates the actual approve/reject judgment to
 * the injected `ConsensusStrategy` (the pluggable seam) and publishes
 * the verdict. */
export class ConsensusService {
  constructor(
    private readonly strategy: ConsensusStrategy,
    private readonly clock: Clock,
    private readonly idGenerator: IdGenerator,
    private readonly eventPublisher?: EventPublisher,
  ) {}

  async decide(proposerId: string, description: string, votes: Readonly<Record<string, boolean>>): Promise<ConsensusResult> {
    const proposalId = this.idGenerator.generate();
    const result = this.strategy.evaluate({ id: proposalId, proposerId, description, votes });

    const event: ConsensusReachedEvent = {
      eventId: this.idGenerator.generate(),
      kind: "ConsensusReached",
      occurredAt: this.clock.now(),
      aggregateId: proposalId,
      proposalId,
      approved: result.approved,
    };
    if (this.eventPublisher) {
      await this.eventPublisher.publish([event]);
    }

    return result;
  }
}
