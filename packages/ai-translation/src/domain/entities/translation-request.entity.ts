/** `sourceLanguage` is optional — when omitted, a `TranslationProvider`
 * is expected to detect it (`detectLanguage`) before translating. ISO
 * 639-1 codes (`"en"`, `"es"`, ...) by convention, never validated by
 * this package beyond non-empty (provider-independent — different
 * providers support different language sets). */
export interface TranslationRequest {
  readonly text: string;
  readonly sourceLanguage?: string;
  readonly targetLanguage: string;
}
