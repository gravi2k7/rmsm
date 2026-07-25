/**
 * The pluggable summarization port `MemorySummarizer` depends on. Kept
 * separate from `MemorySummarizer` itself so the platform's own
 * "provider-independent" constraint is a structural guarantee, not just
 * a convention: `MemorySummarizer` cannot import an LLM SDK without also
 * changing this interface, since it never sees anything more specific
 * than `Summarizer`. `providers/heuristic-summarizer.provider.ts` ships
 * a real, working, non-LLM default; a future
 * `AiGatewayBackedSummarizer` (calling AI-201's own `AiGatewayService`)
 * can implement this same port without `@rmsm/ai-memory` ever depending
 * on `@rmsm/ai-prompts` or any provider SDK.
 */
export interface Summarizer {
  summarize(text: string, targetSentences?: number): Promise<string>;
}
