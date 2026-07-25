import { describe, it, expect } from "vitest";
import { HashEmbeddingProvider } from "../hash-embedding.provider";
import { EmptyTextError } from "../../domain/errors/embedding-domain.errors";

describe("HashEmbeddingProvider", () => {
  it("produces a normalized vector of the configured dimensions", async () => {
    const provider = new HashEmbeddingProvider(16);
    const [vector] = await provider.embed(["cats are mammals"]);

    expect(vector?.dimensions).toBe(16);
    expect(vector?.values).toHaveLength(16);
    const magnitude = Math.sqrt(vector!.values.reduce((sum, v) => sum + v * v, 0));
    expect(magnitude).toBeCloseTo(1, 5);
  });

  it("is deterministic — the same text always produces the same vector", async () => {
    const provider = new HashEmbeddingProvider();
    const [a] = await provider.embed(["hello world"]);
    const [b] = await provider.embed(["hello world"]);
    expect(a).toEqual(b);
  });

  it("produces more similar vectors for texts sharing more words", async () => {
    const provider = new HashEmbeddingProvider();
    const [catsA] = await provider.embed(["cats are small furry mammals"]);
    const [catsB] = await provider.embed(["cats are small furry animals"]);
    const [unrelated] = await provider.embed(["the stock market crashed today"]);

    const dot = (a: readonly number[], b: readonly number[]) => a.reduce((sum, v, i) => sum + v * b[i]!, 0);
    expect(dot(catsA!.values, catsB!.values)).toBeGreaterThan(dot(catsA!.values, unrelated!.values));
  });

  it("throws EmptyTextError for empty text", async () => {
    const provider = new HashEmbeddingProvider();
    await expect(provider.embed(["   "])).rejects.toThrow(EmptyTextError);
  });
});
