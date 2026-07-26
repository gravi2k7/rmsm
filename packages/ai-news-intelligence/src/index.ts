// AI-606: News & Sentiment Intelligence — news aggregation, sentiment
// analysis, market impact estimation, event classification, news
// summarization, watchlists, economic calendar integration, market
// commentary. News/economic-calendar FETCHING is reached only through
// NewsProvider/EconomicCalendarProvider ports, implemented entirely
// outside this package (zero shipped implementations, same "future
// seam" pattern as AI-601's IndicatorProvider) — this package only
// analyzes articles/events once supplied. Reuses AI-601
// (@rmsm/ai-market-intelligence) for market commentary and AI-203
// (@rmsm/ai-memory) for summarization/insight storage.

export {
  SentimentLabel,
  SENTIMENT_LABELS,
  NewsEventCategory,
  NEWS_EVENT_CATEGORIES,
  MarketImpactLevel,
  MARKET_IMPACT_LEVELS,
  EventImportance,
  EVENT_IMPORTANCE_LEVELS,
} from "./domain/enums/news-intelligence.enum";

export type { NewsArticle } from "./domain/entities/news-article.entity";
export type { SentimentAnalysis } from "./domain/entities/sentiment-analysis.entity";
export type { MarketImpactEstimate } from "./domain/entities/market-impact-estimate.entity";
export type { NewsEventClassification } from "./domain/entities/news-event-classification.entity";
export type { NewsSummary } from "./domain/entities/news-summary.entity";
export type { Watchlist, WatchlistItem } from "./domain/entities/watchlist.entity";
export type { EconomicCalendarEvent } from "./domain/entities/economic-calendar-event.entity";
export type { MarketCommentary } from "./domain/entities/market-commentary.entity";
export type { NewsIntelligenceReport } from "./domain/entities/news-intelligence-report.entity";

export { DuplicateWatchlistItemError, WatchlistItemNotFoundError, EmptyArticleTextError } from "./domain/errors/news-intelligence-domain.errors";

export type { NewsProvider } from "./repositories/news-provider.interface";
export type { EconomicCalendarProvider } from "./repositories/economic-calendar-provider.interface";

export type { NewsIntelligenceDomainEvent, NewsAnalyzedEvent } from "./events/news-intelligence-domain-events.interface";
export type { EventPublisher } from "./events/event-publisher.interface";

export { NewsAggregationService } from "./application/services/news-aggregation.service";
export { SentimentAnalysisService } from "./application/services/sentiment-analysis.service";
export { NewsEventClassificationService } from "./application/services/news-event-classification.service";
export { MarketImpactEstimationService } from "./application/services/market-impact-estimation.service";
export { NewsSummarizationService } from "./application/services/news-summarization.service";
export { WatchlistService } from "./application/services/watchlist.service";
export { EconomicCalendarService } from "./application/services/economic-calendar.service";
export { MarketCommentaryService } from "./application/services/market-commentary.service";
export { NewsIntelligenceReportService } from "./application/services/news-intelligence-report.service";

export { InMemoryEventPublisher, type NewsIntelligenceEventListener } from "./infrastructure/in-memory-event-publisher";
