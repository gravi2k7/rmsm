import { describe, expect, it } from "vitest";
import { MemoryService, InMemoryMemoryProvider } from "@rmsm/ai-memory";
import { SentimentAnalysisService } from "../services/sentiment-analysis.service";
import { NewsEventClassificationService } from "../services/news-event-classification.service";
import { MarketImpactEstimationService } from "../services/market-impact-estimation.service";
import { NewsIntelligenceReportService } from "../services/news-intelligence-report.service";
import { buildArticle, buildSymbolCode, FixedClock, RecordingEventPublisher, SequentialIdGenerator } from "./fakes";

function buildService(eventPublisher?: RecordingEventPublisher, memoryService?: MemoryService) {
  return new NewsIntelligenceReportService(
    new SentimentAnalysisService(),
    new NewsEventClassificationService(),
    new MarketImpactEstimationService(),
    new FixedClock(),
    new SequentialIdGenerator(),
    eventPublisher,
    memoryService,
  );
}

describe("NewsIntelligenceReportService", () => {
  it("composes sentiment + classification + impact into one narrative and publishes a domain event", async () => {
    const eventPublisher = new RecordingEventPublisher();
    const service = buildService(eventPublisher);

    const article = buildArticle({ headline: "Federal Reserve signals rate hike", body: "The central bank hinted at tighter monetary policy going forward." });
    const report = await service.generate(article, buildSymbolCode());

    expect(report.articleId).toBe(article.id);
    expect(report.narrative).toContain("CENTRAL_BANK");
    expect(eventPublisher.published.some((e) => e.kind === "NewsAnalyzed")).toBe(true);
  });

  it("integrates with a REAL, unmodified @rmsm/ai-memory MemoryService: persists the report narrative as a retrievable SEMANTIC memory", async () => {
    const memoryRepository = new InMemoryMemoryProvider();
    const memoryService = new MemoryService(memoryRepository);
    const service = buildService(undefined, memoryService);

    const article = buildArticle({ id: "article-memory-test" });
    const report = await service.generate(article, buildSymbolCode());

    const result = await memoryRepository.query({ tags: ["news-intelligence"] });
    const persisted = result.entries.find((entry) => entry.content === report.narrative);

    expect(persisted).toBeDefined();
    expect(persisted?.metadata.tags).toContain("article-memory-test");
    expect(persisted?.metadata.source).toBe("ai-news-intelligence");
  });
});
