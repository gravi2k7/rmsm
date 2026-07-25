import { describe, it, expect } from "vitest";
import { TableExtractionService } from "../services/table-extraction.service";
import { MarkdownTableExtractionProvider } from "../../infrastructure/markdown-table-extraction.provider";
import { FixedClock, SequentialIdGenerator, RecordingEventPublisher } from "./fakes";

describe("TableExtractionService", () => {
  it("extracts a table via a real MarkdownTableExtractionProvider and publishes TableExtracted", async () => {
    const events = new RecordingEventPublisher();
    const service = new TableExtractionService(new MarkdownTableExtractionProvider(), new FixedClock(new Date()), new SequentialIdGenerator(), events);

    const text = "| Name | Age |\n|------|-----|\n| Ada | 30 |";
    const result = await service.extract(text);

    expect(result.rows).toEqual([{ Name: "Ada", Age: "30" }]);
    expect(events.published.map((e) => e.kind)).toEqual(["TableExtracted"]);
  });
});
