import type { Clock, IdGenerator } from "@rmsm/core";
import { MemoryType } from "@rmsm/ai-memory";
import type { MemoryService } from "@rmsm/ai-memory";
import type { NewsArticle } from "../../domain/entities/news-article.entity";
import { SentimentAnalysisService } from "./sentiment-analysis.service";
import { NewsEventClassificationService } from "./news-event-classification.service";
import { MarketImpactEstimationService } from "./market-impact-estimation.service";
import type { NewsIntelligenceReport } from "../../domain/entities/news-intelligence-report.entity";
import type { EventPublisher } from "../../events/event-publisher.interface";
import type { NewsAnalyzedEvent } from "../../events/news-intelligence-domain-events.interface";
import type { SymbolCode } from "@rmsm/market";

/**
 * The flagship composing service — mirrors every other AI-6xx
 * summary/report service: wires `SentimentAnalysisService`,
 * `NewsEventClassificationService`, and `MarketImpactEstimationService`
 * into one narrative report, never recomputing their analyses. When an
 * AI-203 `MemoryService` is injected, every report is ALSO stored as a
 * `MemoryType.SEMANTIC` entry.
 */
export class NewsIntelligenceReportService {
  constructor(
    private readonly sentimentService: SentimentAnalysisService,
    private readonly classificationService: NewsEventClassificationService,
    private readonly impactService: MarketImpactEstimationService,
    private readonly clock: Clock,
    private readonly idGenerator: IdGenerator,
    private readonly eventPublisher?: EventPublisher,
    private readonly memoryService?: MemoryService,
  ) {}

  async generate(article: NewsArticle, symbolCode: SymbolCode): Promise<NewsIntelligenceReport> {
    const sentiment = this.sentimentService.analyze(article);
    const classification = this.classificationService.classify(article);
    const impact = this.impactService.estimate(symbolCode, sentiment, classification);

    const narrative = `"${article.headline}" is ${classification.category} news with ${sentiment.label} sentiment (score ${sentiment.score.toFixed(2)}), estimated ${impact.level} market impact on ${symbolCode.value}.`;
    const now = this.clock.now();
    const report: NewsIntelligenceReport = { articleId: article.id, sentiment, classification, impact, narrative, generatedAt: now };

    if (this.memoryService) {
      await this.memoryService.store({
        type: MemoryType.SEMANTIC,
        content: narrative,
        metadata: { tags: ["news-intelligence", article.id, symbolCode.value], source: "ai-news-intelligence", author: "NewsIntelligenceReportService" },
      });
    }

    if (this.eventPublisher) {
      const event: NewsAnalyzedEvent = {
        eventId: this.idGenerator.generate(),
        kind: "NewsAnalyzed",
        occurredAt: now,
        aggregateId: article.id,
        articleId: article.id,
        sentimentLabel: sentiment.label,
        impactLevel: impact.level,
      };
      await this.eventPublisher.publish([event]);
    }

    return report;
  }
}
