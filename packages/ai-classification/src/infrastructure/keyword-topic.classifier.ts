import type { TopicClassifier } from "../repositories/topic-classifier.interface";
import type { TopicResult } from "../domain/entities/topic-result.entity";
import { EmptyClassificationInputError } from "../domain/errors/classification-domain.errors";

function tokenize(text: string): readonly string[] {
  return text.toLowerCase().match(/[a-z0-9]+/g) ?? [];
}

/** The real, default `TopicClassifier` — scores each registered topic
 * by keyword overlap (same deterministic pattern `KeywordRetriever`
 * uses in `@rmsm/ai-rag`), returning every topic with a non-zero score,
 * highest first. */
export class KeywordTopicClassifier implements TopicClassifier {
  constructor(private readonly topicKeywords: Readonly<Record<string, readonly string[]>>) {}

  async classify(text: string): Promise<TopicResult> {
    if (!text.trim()) {
      throw new EmptyClassificationInputError();
    }

    const tokens = new Set(tokenize(text));
    const topics = Object.entries(this.topicKeywords)
      .map(([name, keywords]) => {
        const matches = keywords.filter((keyword) => tokens.has(keyword.toLowerCase())).length;
        return { name, confidence: keywords.length === 0 ? 0 : matches / keywords.length };
      })
      .filter((topic) => topic.confidence > 0)
      .sort((a, b) => b.confidence - a.confidence);

    return { topics };
  }
}
