import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryVectorIndex } from "../in-memory-vector-index";
import { HashEmbeddingProvider } from "../hash-embedding.provider";
import { EmbeddingDimensionMismatchError } from "../../domain/errors/embedding-domain.errors";

describe("InMemoryVectorIndex", () => {
  const provider = new HashEmbeddingProvider(16);
  let index: InMemoryVectorIndex;

  beforeEach(() => {
    index = new InMemoryVectorIndex();
  });

  it("upserts and searches entries by cosine similarity, most similar first", async () => {
    const [catsVector, dogsVector, marketVector] = await provider.embed(["cats are small furry mammals", "dogs are loyal furry mammals", "the stock market crashed"]);
    await index.upsert([
      { id: "cats", text: "cats are small furry mammals", vector: catsVector! },
      { id: "dogs", text: "dogs are loyal furry mammals", vector: dogsVector! },
      { id: "market", text: "the stock market crashed", vector: marketVector! },
    ]);

    const [queryVector] = await provider.embed(["furry mammals"]);
    const results = await index.search(queryVector!, 2);

    expect(results).toHaveLength(2);
    expect(results.map((r) => r.entry.id)).not.toContain("market");
  });

  it("deletes an entry so it no longer appears in search results", async () => {
    const [vector] = await provider.embed(["hello world"]);
    await index.upsert([{ id: "e1", text: "hello world", vector: vector! }]);
    await index.delete("e1");

    const results = await index.search(vector!, 5);
    expect(results).toHaveLength(0);
  });

  it("size() reflects the current index size", async () => {
    const [vector] = await provider.embed(["hello"]);
    await index.upsert([{ id: "e1", text: "hello", vector: vector! }]);
    expect(index.size()).toBe(1);
  });

  it("throws EmbeddingDimensionMismatchError when query and entry dimensions differ", async () => {
    const [vector] = await provider.embed(["hello"]);
    await index.upsert([{ id: "e1", text: "hello", vector: vector! }]);

    const mismatched = { values: [0.1, 0.2], dimensions: 2 };
    await expect(index.search(mismatched, 5)).rejects.toThrow(EmbeddingDimensionMismatchError);
  });
});
