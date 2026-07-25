import { describe, it, expect, beforeEach } from "vitest";
import { KeywordRetriever } from "../keyword.retriever";
import { InvalidRetrievalQueryError } from "../../domain/errors/rag-domain.errors";

describe("KeywordRetriever", () => {
  let retriever: KeywordRetriever;

  beforeEach(() => {
    retriever = new KeywordRetriever();
    retriever.index([
      { id: "c1", text: "Cats are small mammals that purr." },
      { id: "c2", text: "Dogs are loyal mammals that bark." },
      { id: "c3", text: "The stock market fell today." },
    ]);
  });

  it("ranks chunks by query term overlap, most relevant first", async () => {
    const results = await retriever.retrieve({ text: "small mammals cats", topK: 3 });
    expect(results[0]?.chunk.id).toBe("c1");
    expect(results.some((r) => r.chunk.id === "c3")).toBe(false);
  });

  it("respects topK", async () => {
    const results = await retriever.retrieve({ text: "mammals", topK: 1 });
    expect(results).toHaveLength(1);
  });

  it("removeById excludes a chunk from future retrieval", async () => {
    retriever.removeById("c1");
    const results = await retriever.retrieve({ text: "cats mammals", topK: 3 });
    expect(results.some((r) => r.chunk.id === "c1")).toBe(false);
  });

  it("throws InvalidRetrievalQueryError for a non-positive topK", async () => {
    await expect(retriever.retrieve({ text: "cats", topK: 0 })).rejects.toThrow(InvalidRetrievalQueryError);
  });

  it("throws InvalidRetrievalQueryError for a query with no terms", async () => {
    await expect(retriever.retrieve({ text: "   ", topK: 1 })).rejects.toThrow(InvalidRetrievalQueryError);
  });

  it("size() reflects the current index size", () => {
    expect(retriever.size()).toBe(3);
  });
});
