import type { TranslationRequest } from "../domain/entities/translation-request.entity";
import type { TranslationResult } from "../domain/entities/translation-result.entity";

/**
 * The provider-independence boundary this package is built around — no
 * concrete implementation calls a real translation API. This package
 * ships one real implementation, `DictionaryTranslationProvider`
 * (deterministic word-for-word substitution) — a real Google
 * Translate/DeepL/etc. adapter is a future package's concern,
 * implementing this same interface.
 */
export interface TranslationProvider {
  translate(request: TranslationRequest): Promise<TranslationResult>;
  detectLanguage(text: string): Promise<string>;
}
