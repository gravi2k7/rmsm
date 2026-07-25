import type { MessageRole } from "../enums/memory-type.enum";

/**
 * One turn in a `Conversation`. Held by the `Conversation` aggregate
 * (`conversation.messages`) — never persisted or mutated independently
 * of it, the same "value held by its owning aggregate" role
 * `ConditionRow`/`RuleWithCondition` play for `StrategyVersion` in
 * AI-103.
 */
export interface ConversationMessage {
  readonly id: string;
  readonly conversationId: string;
  readonly role: MessageRole;
  readonly content: string;
  readonly createdAt: Date;
  readonly metadata?: Readonly<Record<string, unknown>>;
}
