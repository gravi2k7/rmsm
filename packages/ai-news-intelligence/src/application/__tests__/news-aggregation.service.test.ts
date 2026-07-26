import { describe, expect, it } from "vitest";
import { NewsAggregationService } from "../services/news-aggregation.service";
import { buildArticle, FakeNewsProvider } from "./fakes";

describe("NewsAggregationService", () => {
  it("returns [] when no provider is wired in", async () => {
    const service = new NewsAggregationService(undefined);
    expect(await service.fetchLatest()).toEqual([]);
  });

  it("dedupes articles with the same headline from a REAL-shaped provider", async () => {
    const provider = new FakeNewsProvider([
      buildArticle({ id: "a1", headline: "Same Headline" }),
      buildArticle({ id: "a2", headline: "Same Headline" }),
      buildArticle({ id: "a3", headline: "Different Headline" }),
    ]);
    const service = new NewsAggregationService(provider);

    const results = await service.fetchLatest();
    expect(results).toHaveLength(2);
  });
});
