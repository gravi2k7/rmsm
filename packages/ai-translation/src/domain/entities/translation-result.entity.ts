export interface TranslationResult {
  readonly translatedText: string;
  readonly sourceLanguage: string;
  readonly targetLanguage: string;
  readonly confidence: number;
}
