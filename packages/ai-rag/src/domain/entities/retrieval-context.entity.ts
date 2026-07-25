import type { RetrievalResult } from "./retrieval-result.entity";

/** The output of `ContextBuilder.build()` — ranked results assembled
 * into one prompt-ready string under a token budget, plus which
 * results made the cut. The shape a caller hands straight to AI-301's
 * `ChatOrchestratorService` (as part of a system/context prompt) or to
 * AI-202's `PromptCompiler` (as a `contextPrompt` fragment). */
export interface RetrievalContext {
  readonly contextText: string;
  readonly usedResults: readonly RetrievalResult[];
  readonly truncated: boolean;
}
