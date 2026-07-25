import type { SentimentResult } from "../domain/entities/sentiment-result.entity";

export interface SentimentAnalyzer {
  analyze(text: string): Promise<SentimentResult>;
}
