import type { TranslationProvider } from "../repositories/translation-provider.interface";
import type { TranslationRequest } from "../domain/entities/translation-request.entity";
import type { TranslationResult } from "../domain/entities/translation-result.entity";
import { EmptyTranslationInputError, UnsupportedLanguagePairError } from "../domain/errors/translation-domain.errors";

/** language -> language -> { sourceWord: targetWord } */
export type TranslationDictionary = Readonly<Record<string, Readonly<Record<string, Readonly<Record<string, string>>>>>>;

function tokenize(text: string): readonly string[] {
  return text.split(/(\s+)/); // keep whitespace so re-joining preserves spacing
}

/**
 * The real, default `TranslationProvider` — deterministic word-for-word
 * substitution using an injected dictionary, and language detection by
 * counting how many of the input's words exist in each known
 * language's vocabulary. No ML model or external API dependency
 * anywhere; a real Google Translate/DeepL/etc. adapter is a future
 * package's concern, implementing this same interface.
 */
export class DictionaryTranslationProvider implements TranslationProvider {
  constructor(private readonly dictionary: TranslationDictionary) {}

  async translate(request: TranslationRequest): Promise<TranslationResult> {
    if (!request.text.trim()) {
      throw new EmptyTranslationInputError();
    }

    const sourceLanguage = request.sourceLanguage ?? (await this.detectLanguage(request.text));
    const wordMap = this.dictionary[sourceLanguage]?.[request.targetLanguage];
    if (!wordMap) {
      throw new UnsupportedLanguagePairError(sourceLanguage, request.targetLanguage);
    }

    let matched = 0;
    let total = 0;
    const translatedText = tokenize(request.text)
      .map((part) => {
        if (/^\s+$/.test(part) || part === "") return part;
        total += 1;
        const translated = wordMap[part.toLowerCase()];
        if (translated) matched += 1;
        return translated ?? part;
      })
      .join("");

    return {
      translatedText,
      sourceLanguage,
      targetLanguage: request.targetLanguage,
      confidence: total === 0 ? 0 : matched / total,
    };
  }

  async detectLanguage(text: string): Promise<string> {
    const words = tokenize(text)
      .filter((part) => !/^\s*$/.test(part))
      .map((word) => word.toLowerCase());

    let bestLanguage = "unknown";
    let bestScore = 0;

    for (const [language, targets] of Object.entries(this.dictionary)) {
      const vocabulary = new Set(Object.values(targets).flatMap((wordMap) => Object.keys(wordMap)));
      const score = words.filter((word) => vocabulary.has(word)).length;
      if (score > bestScore) {
        bestScore = score;
        bestLanguage = language;
      }
    }

    return bestLanguage;
  }
}
