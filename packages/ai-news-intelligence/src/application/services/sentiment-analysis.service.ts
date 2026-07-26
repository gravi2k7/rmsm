import type { NewsArticle } from "../../domain/entities/news-article.entity";
import type { SentimentAnalysis } from "../../domain/entities/sentiment-analysis.entity";
import { SentimentLabel } from "../../domain/enums/news-intelligence.enum";

// A small, transparent lexicon — deterministic and provider-independent
// (zero LLM/network dependency), the same design constraint every
// heuristic default in this platform follows (e.g. AI-203's own
// HeuristicSummarizer). A future AiGatewayBackedSentimentAnalyzer
// implementing the same shape could replace this with a real LLM call.
const POSITIVE_WORDS = ["beat", "beats", "surge", "surges", "growth", "rally", "rallies", "strong", "gain", "gains", "upgrade", "upgraded", "optimistic", "record", "boost"];
const NEGATIVE_WORDS = ["miss", "misses", "plunge", "plunges", "recession", "slump", "weak", "loss", "losses", "downgrade", "downgraded", "pessimistic", "crisis", "cut", "cuts"];

export class SentimentAnalysisService {
  analyze(article: NewsArticle): SentimentAnalysis {
    const words = `${article.headline} ${article.body}`.toLowerCase().split(/\W+/).filter(Boolean);
    if (words.length === 0) {
      return { articleId: article.id, label: SentimentLabel.NEUTRAL, score: 0, confidence: 0 };
    }

    let positiveHits = 0;
    let negativeHits = 0;
    for (const word of words) {
      if (POSITIVE_WORDS.includes(word)) positiveHits += 1;
      if (NEGATIVE_WORDS.includes(word)) negativeHits += 1;
    }

    const totalHits = positiveHits + negativeHits;
    const score = totalHits === 0 ? 0 : (positiveHits - negativeHits) / totalHits;
    const confidence = Math.min(1, totalHits / Math.min(words.length, 20));

    const label = score > 0.15 ? SentimentLabel.POSITIVE : score < -0.15 ? SentimentLabel.NEGATIVE : SentimentLabel.NEUTRAL;

    return { articleId: article.id, label, score, confidence };
  }
}
