import type { IdGenerator, Clock } from "@rmsm/core";
import type { TableExtractionProvider } from "../../repositories/table-extraction-provider.interface";
import type { TableExtractionResult } from "../../domain/entities/table-extraction-result.entity";
import type { EventPublisher } from "../../events/event-publisher.interface";
import type { TableExtractedEvent } from "../../events/extraction-domain-events.interface";

/** Thin orchestration over the injected `TableExtractionProvider`:
 * extract, publish `TableExtracted`. Kept as its own class (rather than
 * calling the provider directly) for the same reason
 * `RetrieverPipeline` wraps `Retriever` in `@rmsm/ai-rag` — a stable
 * observability seam regardless of which provider is wired in. */
export class TableExtractionService {
  constructor(
    private readonly provider: TableExtractionProvider,
    private readonly clock: Clock,
    private readonly idGenerator: IdGenerator,
    private readonly eventPublisher?: EventPublisher,
  ) {}

  async extract(text: string): Promise<TableExtractionResult> {
    const result = await this.provider.extractTable(text);

    if (this.eventPublisher) {
      const event: TableExtractedEvent = {
        eventId: this.idGenerator.generate(),
        kind: "TableExtracted",
        occurredAt: this.clock.now(),
        aggregateId: this.idGenerator.generate(),
        rowCount: result.rows.length,
      };
      await this.eventPublisher.publish([event]);
    }

    return result;
  }
}
