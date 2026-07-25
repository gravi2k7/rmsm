import { AggregateRoot, Guard } from "@rmsm/core";
import type { ConversationMessage } from "./conversation-message.entity";
import type { ConversationStartedEvent, ConversationUpdatedEvent } from "../../events/memory-domain-events.interface";

export interface ConversationStartParams {
  readonly id: string;
  readonly organizationId?: string | null;
  readonly metadata?: Readonly<Record<string, unknown>>;
  readonly now: Date;
  readonly eventId: string;
}

export interface ConversationHydrateParams {
  readonly id: string;
  readonly organizationId: string | null;
  readonly startedAt: Date;
  readonly updatedAt: Date;
  readonly metadata: Readonly<Record<string, unknown>>;
  readonly messages: readonly ConversationMessage[];
}

/**
 * The AggregateRoot for AI-203's own "Conversation Memory" capability —
 * built on `@rmsm/core`'s `AggregateRoot<TId>` (identity + domain-event
 * recording) rather than a bespoke base class, the same reuse this
 * package applies throughout. Owns its own messages (`ConversationMessage[]`)
 * and raises `ConversationStarted`/`ConversationUpdated` — `MemoryEntry`
 * (a plain value, not an aggregate) is a deliberately different, simpler
 * shape for the platform's other memory capabilities, which don't need
 * append-only turn-by-turn history or these two specific lifecycle events.
 */
export class Conversation extends AggregateRoot<string> {
  public readonly organizationId: string | null;
  public readonly startedAt: Date;
  private _updatedAt: Date;
  private readonly _metadata: Readonly<Record<string, unknown>>;
  private readonly _messages: ConversationMessage[] = [];

  private constructor(id: string, organizationId: string | null, startedAt: Date, metadata: Readonly<Record<string, unknown>>) {
    super(id);
    this.organizationId = organizationId;
    this.startedAt = startedAt;
    this._updatedAt = startedAt;
    this._metadata = metadata;
  }

  /** Starts a brand-new conversation, raising `ConversationStarted`. */
  static start(params: ConversationStartParams): Conversation {
    Guard.againstEmptyString(params.id, "id");
    const conversation = new Conversation(params.id, params.organizationId ?? null, params.now, params.metadata ?? {});
    const event: ConversationStartedEvent = {
      eventId: params.eventId,
      kind: "ConversationStarted",
      occurredAt: params.now,
      aggregateId: params.id,
      conversationId: params.id,
      organizationId: conversation.organizationId,
    };
    conversation.addDomainEvent(event);
    return conversation;
  }

  /** Reconstructs a `Conversation` from persisted state (repository
   * hydration) — no events raised, since nothing new happened as a
   * result of loading it. */
  static hydrate(params: ConversationHydrateParams): Conversation {
    const conversation = new Conversation(params.id, params.organizationId, params.startedAt, params.metadata);
    conversation._updatedAt = params.updatedAt;
    conversation._messages.push(...params.messages);
    return conversation;
  }

  get messages(): readonly ConversationMessage[] {
    return this._messages;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  get metadata(): Readonly<Record<string, unknown>> {
    return this._metadata;
  }

  /** Appends a turn, raising `ConversationUpdated`. */
  addMessage(message: ConversationMessage, eventId: string): void {
    Guard.ensure(message.conversationId === this.id, "message.conversationId must match this conversation's id.");
    this._messages.push(message);
    this._updatedAt = message.createdAt;
    const event: ConversationUpdatedEvent = {
      eventId,
      kind: "ConversationUpdated",
      occurredAt: message.createdAt,
      aggregateId: this.id,
      conversationId: this.id,
      messageId: message.id,
      role: message.role,
    };
    this.addDomainEvent(event);
  }
}
