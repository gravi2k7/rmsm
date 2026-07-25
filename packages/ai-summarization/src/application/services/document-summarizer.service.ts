import type { IdGenerator, Clock } from "@rmsm/core";
import type { Summarizer } from "@rmsm/ai-memory";
import { RecursiveSummarizer, type RecursiveSummarizationOptions } from "./recursive-summarizer.service";
import type { EventPublisher as SummarizationEventPublisher } from "../../events/event-publisher.interface";
import type { DocumentSummarizedEvent } from "../../events/summarization-domain-events.interface";

/**
 * The "document summarization" capability for documents too long for
 * a single `Summarizer` pass — delegates entirely to
 * `RecursiveSummarizer` (composition, not duplication) and just adds
 * the `DocumentSummarized` event on top. `@rmsm/ai-documents`'
 * `DocumentIntelligenceService` already covers the single-pass case
 * (a summary alongside parsing/chunking/metadata); this class is for
 * documents whose full text exceeds what one `Summarizer.summarize()`
 * call should reasonably take.
 */
export class DocumentSummarizer {
  private readonly recursiveSummarizer: RecursiveSummarizer;

  constructor(
    summarizer: Summarizer,
    private readonly clock: Clock,
    private readonly idGenerator: IdGenerator,
    private readonly eventPublisher?: SummarizationEventPublisher,
  ) {
    this.recursiveSummarizer = new RecursiveSummarizer(summarizer, clock, idGenerator, eventPublisher);
  }

  async summarize(documentText: string, options: RecursiveSummarizationOptions): Promise<string> {
    const result = await this.recursiveSummarizer.summarize(documentText, options);

    if (this.eventPublisher) {
      const event: DocumentSummarizedEvent = {
        eventId: this.idGenerator.generate(),
        kind: "DocumentSummarized",
        occurredAt: this.clock.now(),
        aggregateId: this.idGenerator.generate(),
        characterCount: documentText.length,
      };
      await this.eventPublisher.publish([event]);
    }

    return result.summary;
  }
}
