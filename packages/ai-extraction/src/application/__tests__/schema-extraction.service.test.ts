import { describe, it, expect } from "vitest";
import { z } from "zod";
import { SchemaExtractionService } from "../services/schema-extraction.service";
import { RegexJsonExtractionProvider } from "../../infrastructure/regex-json-extraction.provider";
import { FixedClock, SequentialIdGenerator, RecordingEventPublisher } from "./fakes";

const personSchema = z.object({ name: z.string(), age: z.number() });

describe("SchemaExtractionService", () => {
  it("extracts JSON via a real RegexJsonExtractionProvider and validates it against a real zod schema", async () => {
    const events = new RecordingEventPublisher();
    const service = new SchemaExtractionService(new RegexJsonExtractionProvider(), new FixedClock(new Date()), new SequentialIdGenerator(), events);

    const result = await service.extract('The extracted person is: {"name": "Ada", "age": 30}', {
      id: "s1",
      name: "Person",
      schema: personSchema,
    });

    expect(result.valid).toBe(true);
    expect(result.data).toEqual({ name: "Ada", age: 30 });
    expect(events.published.map((e) => e.kind)).toEqual(["JsonExtracted", "SchemaValidated"]);
  });

  it("returns valid: false with issue messages when the extracted data fails validation, without throwing", async () => {
    const events = new RecordingEventPublisher();
    const service = new SchemaExtractionService(new RegexJsonExtractionProvider(), new FixedClock(new Date()), new SequentialIdGenerator(), events);

    const result = await service.extract('{"name": "Ada"}', { id: "s1", name: "Person", schema: personSchema });

    expect(result.valid).toBe(false);
    expect(result.data).toBeNull();
    expect(result.errors.length).toBeGreaterThan(0);
    expect(events.published.map((e) => e.kind)).toEqual(["JsonExtracted", "SchemaValidationFailed"]);
  });
});
