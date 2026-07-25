import type { IdGenerator, Clock } from "@rmsm/core";
import type { Retriever } from "../../repositories/retriever.interface";
import type { RetrievalQuery } from "../../domain/entities/retrieval-query.entity";
import type { RetrievalResult } from "../../domain/entities/retrieval-result.entity";
import type { EventPublisher } from "../../events/event-publisher.interface";
import type { RetrievalCompletedEvent } from "../../events/rag-domain-events.interface";

/** The thinnest possible orchestration over a `Retriever`: run the
 * query, publish `RetrievalCompleted`. Kept as its own class (rather
 * than calling `retriever.retrieve()` directly) so every retrieval —
 * regardless of which `Retriever` implementation is wired in — gets
 * the same observability event, the seam a future AI-204 adapter
 * would attach to exactly the way `MemoryEventTracingAdapter` attaches
 * to `@rmsm/ai-memory`. */
export class RetrieverPipeline {
  constructor(
    private readonly retriever: Retriever,
    private readonly clock: Clock,
    private readonly idGenerator: IdGenerator,
    private readonly eventPublisher?: EventPublisher,
  ) {}

  async run(query: RetrievalQuery): Promise<readonly RetrievalResult[]> {
    const results = await this.retriever.retrieve(query);

    if (this.eventPublisher) {
      const event: RetrievalCompletedEvent = {
        eventId: this.idGenerator.generate(),
        kind: "RetrievalCompleted",
        occurredAt: this.clock.now(),
        aggregateId: query.text,
        queryText: query.text,
        resultCount: results.length,
      };
      await this.eventPublisher.publish([event]);
    }

    return results;
  }
}
