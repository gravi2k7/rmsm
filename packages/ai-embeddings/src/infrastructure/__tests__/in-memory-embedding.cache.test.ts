import { describe, it, expect } from "vitest";
import { InMemoryEmbeddingCache } from "../in-memory-embedding.cache";

describe("InMemoryEmbeddingCache", () => {
  it("returns null for an uncached text", async () => {
    const cache = new InMemoryEmbeddingCache();
    expect(await cache.get("missing")).toBeNull();
  });

  it("stores and retrieves a vector by text", async () => {
    const cache = new InMemoryEmbeddingCache();
    const vector = { values: [0.1, 0.2], dimensions: 2 };
    await cache.set("hello", vector);
    expect(await cache.get("hello")).toEqual(vector);
    expect(cache.size()).toBe(1);
  });
});
