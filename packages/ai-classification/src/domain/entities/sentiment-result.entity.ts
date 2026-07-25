import type { Sentiment } from "../enums/classification.enum";

export interface SentimentResult {
  readonly sentiment: Sentiment;
  readonly confidence: number;
}
