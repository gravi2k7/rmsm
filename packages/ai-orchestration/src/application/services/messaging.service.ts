import type { Clock, IdGenerator } from "@rmsm/core";
import type { MessageBus, AgentMessageHandler } from "../../repositories/message-bus.interface";
import type { EventPublisher } from "../../events/event-publisher.interface";
import type { AgentMessageSentEvent } from "../../events/orchestration-domain-events.interface";

/** The "agent messaging" capability: point-to-point delivery between
 * agents via the injected `MessageBus`, publishing an
 * `AgentMessageSent` domain event alongside every delivery. */
export class MessagingService {
  constructor(
    private readonly bus: MessageBus,
    private readonly clock: Clock,
    private readonly idGenerator: IdGenerator,
    private readonly eventPublisher?: EventPublisher,
  ) {}

  async send(fromAgentId: string, toAgentId: string, content: unknown): Promise<void> {
    const now = this.clock.now();
    await this.bus.send({ id: this.idGenerator.generate(), fromAgentId, toAgentId, content, sentAt: now });

    const event: AgentMessageSentEvent = {
      eventId: this.idGenerator.generate(),
      kind: "AgentMessageSent",
      occurredAt: now,
      aggregateId: toAgentId,
      fromAgentId,
      toAgentId,
    };
    if (this.eventPublisher) {
      await this.eventPublisher.publish([event]);
    }
  }

  subscribe(agentId: string, handler: AgentMessageHandler): () => void {
    return this.bus.subscribe(agentId, handler);
  }
}
