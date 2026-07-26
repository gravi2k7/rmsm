import { describe, expect, it } from "vitest";
import { NewsEventClassificationService } from "../services/news-event-classification.service";
import { NewsEventCategory } from "../../domain/enums/news-intelligence.enum";
import { buildArticle } from "./fakes";

describe("NewsEventClassificationService", () => {
  const service = new NewsEventClassificationService();

  it("classifies earnings-related text as EARNINGS", () => {
    const article = buildArticle({ headline: "Company posts quarterly earnings beat", body: "Revenue and EPS both topped estimates." });
    expect(service.classify(article).category).toBe(NewsEventCategory.EARNINGS);
  });

  it("classifies central-bank text as CENTRAL_BANK", () => {
    const article = buildArticle({ headline: "Federal Reserve signals rate hike", body: "The central bank hinted at tighter policy." });
    expect(service.classify(article).category).toBe(NewsEventCategory.CENTRAL_BANK);
  });

  it("classifies unrelated text as OTHER", () => {
    const article = buildArticle({ headline: "Local bakery opens new location", body: "Residents welcomed the new shop." });
    expect(service.classify(article).category).toBe(NewsEventCategory.OTHER);
  });
});
