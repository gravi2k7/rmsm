export const SentimentLabel = {
  POSITIVE: "POSITIVE",
  NEUTRAL: "NEUTRAL",
  NEGATIVE: "NEGATIVE",
} as const;
export type SentimentLabel = (typeof SentimentLabel)[keyof typeof SentimentLabel];
export const SENTIMENT_LABELS = Object.values(SentimentLabel);

export const NewsEventCategory = {
  EARNINGS: "EARNINGS",
  ECONOMIC_DATA: "ECONOMIC_DATA",
  CENTRAL_BANK: "CENTRAL_BANK",
  GEOPOLITICAL: "GEOPOLITICAL",
  CORPORATE_ACTION: "CORPORATE_ACTION",
  OTHER: "OTHER",
} as const;
export type NewsEventCategory = (typeof NewsEventCategory)[keyof typeof NewsEventCategory];
export const NEWS_EVENT_CATEGORIES = Object.values(NewsEventCategory);

export const MarketImpactLevel = {
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
} as const;
export type MarketImpactLevel = (typeof MarketImpactLevel)[keyof typeof MarketImpactLevel];
export const MARKET_IMPACT_LEVELS = Object.values(MarketImpactLevel);

export const EventImportance = {
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
} as const;
export type EventImportance = (typeof EventImportance)[keyof typeof EventImportance];
export const EVENT_IMPORTANCE_LEVELS = Object.values(EventImportance);
