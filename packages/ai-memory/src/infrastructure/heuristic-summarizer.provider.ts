import type { Summarizer } from "../repositories/summarizer.interface";

/**
 * The real, default `Summarizer` — a plain extractive heuristic (first
 * `targetSentences` sentences), zero LLM/provider dependency, per the
 * platform-wide constraint that memory must be provider-independent.
 * Deliberately simple: this is a working fallback that never fails and
 * never calls out to anything, not an attempt at high-quality
 * summarization. A future `AiGatewayBackedSummarizer` (calling AI-201's
 * `AiGatewayService` for a real LLM-produced summary) implements the
 * exact same `Summarizer` port and can replace this one wherever a
 * caller composes `MemorySummarizer`, with zero change to
 * `MemorySummarizer` itself.
 */
export class HeuristicSummarizer implements Summarizer {
  async summarize(text: string, targetSentences = 3): Promise<string> {
    const sentences = text
      .split(/(?<=[.!?])\s+/)
      .map((sentence) => sentence.trim())
      .filter((sentence) => sentence.length > 0);

    if (sentences.length === 0) return "";
    return sentences.slice(0, targetSentences).join(" ");
  }
}
