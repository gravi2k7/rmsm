import type { IdGenerator, Clock } from "@rmsm/core";
import { estimateTokenCount } from "@rmsm/ai-memory";
import type { RetrievalResult } from "../../domain/entities/retrieval-result.entity";
import type { RetrievalContext } from "../../domain/entities/retrieval-context.entity";
import type { EventPublisher } from "../../events/event-publisher.interface";
import type { ContextBuiltEvent } from "../../events/rag-domain-events.interface";

/**
 * Assembles ranked `RetrievalResult`s into one prompt-ready string
 * under a token budget — highest-score results first, dropped once the
 * budget is exhausted. Token estimation is delegated to
 * `@rmsm/ai-memory`'s own `estimateTokenCount` (reused, not
 * reimplemented, per "no duplicated logic") — the assembly *policy*
 * itself (rank-ordered greedy fill) is new to this package, the same
 * "reuse the primitive, own the domain logic" split AI-302/AI-303 made
 * for `Summarizer`.
 */
export class ContextBuilder {
  constructor(
    private readonly clock: Clock,
    private readonly idGenerator: IdGenerator,
    private readonly eventPublisher?: EventPublisher,
  ) {}

  async build(results: readonly RetrievalResult[], maxTokens: number): Promise<RetrievalContext> {
    const used: RetrievalResult[] = [];
    let tokensSoFar = 0;
    let truncated = false;

    for (const result of results) {
      const tokens = estimateTokenCount(result.chunk.text);
      if (tokensSoFar + tokens > maxTokens) {
        truncated = true;
        continue;
      }
      used.push(result);
      tokensSoFar += tokens;
    }

    const context: RetrievalContext = {
      contextText: used.map((result) => result.chunk.text).join("\n\n"),
      usedResults: used,
      truncated,
    };

    if (this.eventPublisher) {
      const event: ContextBuiltEvent = {
        eventId: this.idGenerator.generate(),
        kind: "ContextBuilt",
        occurredAt: this.clock.now(),
        aggregateId: this.idGenerator.generate(),
        usedResultCount: used.length,
        truncated,
      };
      await this.eventPublisher.publish([event]);
    }

    return context;
  }
}
