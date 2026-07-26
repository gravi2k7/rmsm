import { describe, expect, it } from "vitest";
import { HeuristicSummarizer } from "@rmsm/ai-memory";
import { NewsSummarizationService } from "../services/news-summarization.service";
import { buildArticle } from "./fakes";

describe("NewsSummarizationService", () => {
  it("condenses an article's body through a REAL, unmodified @rmsm/ai-memory HeuristicSummarizer", async () => {
    const article = buildArticle({ body: "Sentence one. Sentence two. Sentence three. Sentence four." });
    const service = new NewsSummarizationService(new HeuristicSummarizer());

    const summary = await service.summarize(article, 2);
    expect(summary.narrative).toBe("Sentence one. Sentence two.");
  });

  it("falls back to the headline when the body summarizes to nothing", async () => {
    const article = buildArticle({ body: "" });
    const service = new NewsSummarizationService(new HeuristicSummarizer());

    const summary = await service.summarize(article);
    expect(summary.narrative).toBe(article.headline);
  });
});
