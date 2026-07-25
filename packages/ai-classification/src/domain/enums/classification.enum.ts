export enum Sentiment {
  POSITIVE = "positive",
  NEGATIVE = "negative",
  NEUTRAL = "neutral",
}

export const SENTIMENTS = Object.values(Sentiment) as readonly Sentiment[];
