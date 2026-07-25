import type { IdGenerator, Clock } from "@rmsm/core";
import type { Summarizer } from "@rmsm/ai-memory";
import type { DocumentSource } from "../../domain/entities/document-source.entity";
import type { ExtractionResult } from "../../domain/entities/extraction-result.entity";
import { EmptyDocumentError } from "../../domain/errors/document-domain.errors";
import type { DocumentParserRegistry } from "../../infrastructure/document-parser.registry";
import { DocumentChunker, type ChunkOptions } from "./document-chunker.service";
import type { EventPublisher } from "../../events/event-publisher.interface";
import type {
  DocumentParsedEvent,
  DocumentChunkedEvent,
  DocumentSummarizedEvent,
  DocumentParseFailedEvent,
  DocumentDomainEvent,
} from "../../events/document-domain-events.interface";

const DEFAULT_CHUNK_OPTIONS: ChunkOptions = { maxChunkChars: 1000, overlapChars: 100 };

/**
 * Orchestrates AI-302's full pipeline — parse, chunk, extract metadata,
 * and (optionally) summarize — without owning any of those concerns
 * itself: parsing is delegated to `DocumentParserRegistry`, chunking to
 * `DocumentChunker`, and summarization to an injected `Summarizer` —
 * deliberately `@rmsm/ai-memory`'s own `Summarizer` port/`HeuristicSummarizer`
 * implementation, reused rather than rebuilt (per "no duplicated logic").
 */
export class DocumentIntelligenceService {
  constructor(
    private readonly parserRegistry: DocumentParserRegistry,
    private readonly chunker: DocumentChunker,
    private readonly clock: Clock,
    private readonly idGenerator: IdGenerator,
    private readonly summarizer?: Summarizer,
    private readonly eventPublisher?: EventPublisher,
  ) {}

  async process(source: DocumentSource, chunkOptions: ChunkOptions = DEFAULT_CHUNK_OPTIONS): Promise<ExtractionResult> {
    let parsed;
    try {
      parsed = await this.parserRegistry.parse(source);
    } catch (error) {
      await this.publish([this.parseFailedEvent(source.id, error)]);
      throw error;
    }

    if (!parsed.fullText.trim()) {
      throw new EmptyDocumentError(source.id);
    }
    await this.publish([this.parsedEvent(source.id, parsed.pages.length)]);

    const chunks = this.chunker.chunk(parsed, chunkOptions);
    await this.publish([this.chunkedEvent(source.id, chunks.length)]);

    const metadata = {
      sourceId: source.id,
      fileName: source.fileName,
      mimeType: source.mimeType,
      pageCount: parsed.pages.length,
      characterCount: parsed.fullText.length,
      extractedAt: this.clock.now(),
    };

    let summary: string | undefined;
    if (this.summarizer) {
      summary = await this.summarizer.summarize(parsed.fullText);
      await this.publish([this.summarizedEvent(source.id)]);
    }

    return { parsed, chunks, metadata, summary };
  }

  private parsedEvent(sourceId: string, pageCount: number): DocumentParsedEvent {
    return { eventId: this.idGenerator.generate(), kind: "DocumentParsed", occurredAt: this.clock.now(), aggregateId: sourceId, sourceId, pageCount };
  }

  private chunkedEvent(sourceId: string, chunkCount: number): DocumentChunkedEvent {
    return { eventId: this.idGenerator.generate(), kind: "DocumentChunked", occurredAt: this.clock.now(), aggregateId: sourceId, sourceId, chunkCount };
  }

  private summarizedEvent(sourceId: string): DocumentSummarizedEvent {
    return { eventId: this.idGenerator.generate(), kind: "DocumentSummarized", occurredAt: this.clock.now(), aggregateId: sourceId, sourceId };
  }

  private parseFailedEvent(sourceId: string, error: unknown): DocumentParseFailedEvent {
    return {
      eventId: this.idGenerator.generate(),
      kind: "DocumentParseFailed",
      occurredAt: this.clock.now(),
      aggregateId: sourceId,
      sourceId,
      reason: error instanceof Error ? error.message : String(error),
    };
  }

  private async publish(events: readonly DocumentDomainEvent[]): Promise<void> {
    if (this.eventPublisher) {
      await this.eventPublisher.publish(events);
    }
  }
}
