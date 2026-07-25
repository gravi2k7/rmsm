import type { IdGenerator, Clock } from "@rmsm/core";
import type { Summarizer, ConversationMessage } from "@rmsm/ai-memory";
import { EmptyContentError } from "../../domain/errors/summarization-domain.errors";
import type { EventPublisher } from "../../events/event-publisher.interface";
import type { ConversationSummarizedEvent } from "../../events/summarization-domain-events.interface";

/**
 * Summarizes a conversation's turns — takes `@rmsm/ai-memory`'s own
 * `ConversationMessage[]` directly (the real integration point:
 * callers pass `conversationService.getMessages(id)`'s result straight
 * in, no adapter needed), formats each turn as `"role: content"`, and
 * delegates the actual condensation to the injected `Summarizer` —
 * again `@rmsm/ai-memory`'s own port, reused rather than rebuilt.
 */
export class ConversationSummarizer {
  constructor(
    private readonly summarizer: Summarizer,
    private readonly clock: Clock,
    private readonly idGenerator: IdGenerator,
    private readonly eventPublisher?: EventPublisher,
  ) {}

  async summarize(messages: readonly ConversationMessage[]): Promise<string> {
    if (messages.length === 0) {
      throw new EmptyContentError();
    }

    const transcript = messages.map((message) => `${message.role}: ${message.content}`).join("\n");
    const summary = await this.summarizer.summarize(transcript);

    if (this.eventPublisher) {
      const event: ConversationSummarizedEvent = {
        eventId: this.idGenerator.generate(),
        kind: "ConversationSummarized",
        occurredAt: this.clock.now(),
        aggregateId: messages[0]!.conversationId,
        messageCount: messages.length,
      };
      await this.eventPublisher.publish([event]);
    }

    return summary;
  }
}
