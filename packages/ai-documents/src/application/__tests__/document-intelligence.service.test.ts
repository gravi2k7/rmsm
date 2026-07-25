import { describe, it, expect, beforeEach } from "vitest";
import { HeuristicSummarizer } from "@rmsm/ai-memory";
import { DocumentIntelligenceService } from "../services/document-intelligence.service";
import { DocumentChunker } from "../services/document-chunker.service";
import { DocumentParserRegistry } from "../../infrastructure/document-parser.registry";
import { PlainTextDocumentParser } from "../../infrastructure/plain-text-document.parser";
import { EmptyDocumentError } from "../../domain/errors/document-domain.errors";
import { DocumentType } from "../../domain/enums/document.enum";
import { FixedClock, SequentialIdGenerator, RecordingEventPublisher } from "./fakes";

describe("DocumentIntelligenceService", () => {
  let registry: DocumentParserRegistry;
  let events: RecordingEventPublisher;
  let service: DocumentIntelligenceService;

  beforeEach(() => {
    registry = new DocumentParserRegistry();
    registry.register(new PlainTextDocumentParser());
    events = new RecordingEventPublisher();
    service = new DocumentIntelligenceService(
      registry,
      new DocumentChunker(),
      new FixedClock(new Date("2026-01-01T00:00:00.000Z")),
      new SequentialIdGenerator(),
      new HeuristicSummarizer(),
      events,
    );
  });

  it("parses, chunks, extracts metadata, and summarizes using @rmsm/ai-memory's real HeuristicSummarizer", async () => {
    const text = "First sentence about cats. Second sentence about dogs. Third sentence about birds. Fourth sentence about fish.";
    const source = { id: "s1", fileName: "a.txt", mimeType: "text/plain", type: DocumentType.TEXT, bytes: new TextEncoder().encode(text) };

    const result = await service.process(source, { maxChunkChars: 40, overlapChars: 5 });

    expect(result.parsed.fullText).toBe(text);
    expect(result.chunks.length).toBeGreaterThan(1);
    expect(result.metadata.characterCount).toBe(text.length);
    expect(result.summary).toBeDefined();
    expect(result.summary).not.toBe(text);

    expect(events.published.map((e) => e.kind)).toEqual(["DocumentParsed", "DocumentChunked", "DocumentSummarized"]);
  });

  it("throws EmptyDocumentError for a document with no extractable text", async () => {
    const source = { id: "s2", fileName: "empty.txt", mimeType: "text/plain", type: DocumentType.TEXT, bytes: new TextEncoder().encode("   ") };
    await expect(service.process(source)).rejects.toThrow(EmptyDocumentError);
  });

  it("skips summarization when no Summarizer is injected", async () => {
    const serviceWithoutSummarizer = new DocumentIntelligenceService(registry, new DocumentChunker(), new FixedClock(new Date()), new SequentialIdGenerator());
    const source = { id: "s3", fileName: "a.txt", mimeType: "text/plain", type: DocumentType.TEXT, bytes: new TextEncoder().encode("hello") };

    const result = await serviceWithoutSummarizer.process(source);
    expect(result.summary).toBeUndefined();
  });
});
