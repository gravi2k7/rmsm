import type { SentimentAnalyzer } from "../repositories/sentiment-analyzer.interface";
import type { SentimentResult } from "../domain/entities/sentiment-result.entity";
import { Sentiment } from "../domain/enums/classification.enum";
import { EmptyClassificationInputError } from "../domain/errors/classification-domain.errors";

const DEFAULT_POSITIVE_WORDS = ["good", "great", "excellent", "happy", "love", "amazing", "wonderful"];
const DEFAULT_NEGATIVE_WORDS = ["bad", "terrible", "awful", "hate", "angry", "horrible", "poor"];

function tokenize(text: string): readonly string[] {
  return text.toLowerCase().match(/[a-z0-9]+/g) ?? [];
}

/** The real, default `SentimentAnalyzer` — counts occurrences of words
 * from a small positive/negative lexicon (overridable via the
 * constructor) and derives a sentiment + confidence from the balance.
 * No ML model — deterministic and fully inspectable. */
export class LexiconSentimentAnalyzer implements SentimentAnalyzer {
  constructor(
    private readonly positiveWords: readonly string[] = DEFAULT_POSITIVE_WORDS,
    private readonly negativeWords: readonly string[] = DEFAULT_NEGATIVE_WORDS,
  ) {}

  async analyze(text: string): Promise<SentimentResult> {
    if (!text.trim()) {
      throw new EmptyClassificationInputError();
    }

    const tokens = tokenize(text);
    const positiveCount = tokens.filter((token) => this.positiveWords.includes(token)).length;
    const negativeCount = tokens.filter((token) => this.negativeWords.includes(token)).length;
    const totalSignal = positiveCount + negativeCount;

    if (totalSignal === 0) {
      return { sentiment: Sentiment.NEUTRAL, confidence: 0 };
    }
    if (positiveCount === negativeCount) {
      return { sentiment: Sentiment.NEUTRAL, confidence: 0.5 };
    }

    const sentiment = positiveCount > negativeCount ? Sentiment.POSITIVE : Sentiment.NEGATIVE;
    const confidence = Math.max(positiveCount, negativeCount) / totalSignal;
    return { sentiment, confidence };
  }
}
