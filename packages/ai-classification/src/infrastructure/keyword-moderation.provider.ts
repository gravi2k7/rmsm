import type { ModerationProvider } from "../repositories/moderation-provider.interface";
import type { ModerationResult } from "../domain/entities/moderation-result.entity";
import { EmptyClassificationInputError } from "../domain/errors/classification-domain.errors";

/** The real, default `ModerationProvider` — flags content containing
 * any word from a configurable banned-word-to-category map. No
 * external moderation API dependency; a real provider (e.g. an
 * LLM-based or third-party moderation service) is a future adapter of
 * this interface. */
export class KeywordModerationProvider implements ModerationProvider {
  constructor(private readonly bannedWordsByCategory: Readonly<Record<string, readonly string[]>>) {}

  async moderate(text: string): Promise<ModerationResult> {
    if (!text.trim()) {
      throw new EmptyClassificationInputError();
    }

    const lowerText = text.toLowerCase();
    const matchedCategories: string[] = [];
    let totalMatches = 0;

    for (const [category, words] of Object.entries(this.bannedWordsByCategory)) {
      const matches = words.filter((word) => lowerText.includes(word.toLowerCase()));
      if (matches.length > 0) {
        matchedCategories.push(category);
        totalMatches += matches.length;
      }
    }

    return {
      flagged: matchedCategories.length > 0,
      categories: matchedCategories,
      confidence: matchedCategories.length > 0 ? Math.min(1, totalMatches / 3) : 0,
    };
  }
}
