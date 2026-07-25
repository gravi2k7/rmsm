/**
 * The provider-independence boundary for JSON extraction — no LLM/API
 * dependency in any implementation shipped here. `RegexJsonExtractionProvider`
 * (a real, deterministic bracket-matcher) is the only concrete
 * implementation this package ships; an LLM-based structured-extraction
 * adapter (calling out through AI-201's Gateway) is a future package's
 * concern, implementing this same interface.
 */
export interface JsonExtractionProvider {
  extractJson(text: string): Promise<unknown>;
}
