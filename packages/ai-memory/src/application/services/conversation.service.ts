import { SystemClock } from "@rmsm/core";
import type { Clock, IdGenerator } from "@rmsm/core";
import { Conversation } from "../../domain/entities/conversation.entity";
import type { ConversationMessage } from "../../domain/entities/conversation-message.entity";
import type { MessageRole } from "../../domain/enums/memory-type.enum";
import { ConversationNotFoundError, DuplicateConversationError } from "../../domain/errors/memory-domain.errors";
import type { ConversationRepository } from "../../repositories/conversation-repository.interface";
import type { EventPublisher } from "../../events/event-publisher.interface";
import type { MemoryDomainEvent } from "../../events/memory-domain-events.interface";
import { SystemIdGenerator } from "../system-id-generator";

/**
 * Owns "Conversation Memory" — starting conversations and appending
 * turns, via the `Conversation` aggregate. Every mutation publishes
 * whatever domain events the aggregate just raised (`pullDomainEvents`)
 * through the injected `EventPublisher`, immediately after a successful
 * `repository.save()` — the same "collect during the operation, publish
 * after persistence succeeds" ordering `@rmsm/core`'s own
 * `AggregateRoot` doc comment prescribes.
 */
export class ConversationService {
  constructor(
    private readonly repository: ConversationRepository,
    private readonly eventPublisher?: EventPublisher,
    private readonly clock: Clock = new SystemClock(),
    private readonly idGenerator: IdGenerator = new SystemIdGenerator(),
  ) {}

  async start(id: string, organizationId?: string | null, metadata?: Readonly<Record<string, unknown>>): Promise<Conversation> {
    const existing = await this.repository.findById(id);
    if (existing) throw new DuplicateConversationError(id);

    const conversation = Conversation.start({
      id,
      organizationId,
      metadata,
      now: this.clock.now(),
      eventId: this.idGenerator.generate(),
    });

    await this.repository.save(conversation);
    await this.publishPendingEvents(conversation);
    return conversation;
  }

  async addMessage(
    conversationId: string,
    role: MessageRole,
    content: string,
    metadata?: Readonly<Record<string, unknown>>,
  ): Promise<ConversationMessage> {
    const conversation = await this.getOrThrow(conversationId);

    const message: ConversationMessage = {
      id: this.idGenerator.generate(),
      conversationId,
      role,
      content,
      createdAt: this.clock.now(),
      metadata,
    };

    conversation.addMessage(message, this.idGenerator.generate());
    await this.repository.save(conversation);
    await this.publishPendingEvents(conversation);
    return message;
  }

  async getMessages(conversationId: string): Promise<readonly ConversationMessage[]> {
    const conversation = await this.getOrThrow(conversationId);
    return conversation.messages;
  }

  async get(conversationId: string): Promise<Conversation> {
    return this.getOrThrow(conversationId);
  }

  private async getOrThrow(id: string): Promise<Conversation> {
    const conversation = await this.repository.findById(id);
    if (!conversation) throw new ConversationNotFoundError(id);
    return conversation;
  }

  private async publishPendingEvents(conversation: Conversation): Promise<void> {
    // `Conversation.pullDomainEvents()` returns `@rmsm/core`'s own broad
    // `DomainEvent[]` (its base class's signature) — safe to narrow here
    // because `Conversation`'s own methods only ever call
    // `addDomainEvent` with a `ConversationStartedEvent`/
    // `ConversationUpdatedEvent`, both members of `MemoryDomainEvent`.
    const events = conversation.pullDomainEvents() as readonly MemoryDomainEvent[];
    if (events.length > 0 && this.eventPublisher) {
      await this.eventPublisher.publish(events);
    }
  }
}
