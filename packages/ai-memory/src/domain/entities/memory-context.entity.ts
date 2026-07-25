import type { ConversationMessage } from "./conversation-message.entity";

/**
 * The output of `ContextAssembler` — everything a caller needs to build
 * a provider request: relevant longer-lived memory folded into one
 * `systemContext` string, plus recent conversation turns kept verbatim.
 * Deliberately does NOT produce a `CompiledPrompt` (`@rmsm/ai-prompts`)
 * itself — assembling memory into context and compiling a prompt from
 * fragments are different concerns owned by different packages; a
 * caller that needs both composes them (e.g. passes
 * `MemoryContext.systemContext` in as one of `PromptCompiler`'s own
 * `contextPrompt` fragment slots).
 */
export interface MemoryContext {
  readonly conversationId: string | null;
  readonly systemContext: string;
  readonly messages: readonly ConversationMessage[];
  /** Which `MemoryEntry` ids contributed to `systemContext` — for audit/observability (AI-204 can trace exactly what memory informed a given request). */
  readonly includedMemoryEntryIds: readonly string[];
  readonly estimatedTokenCount: number;
  /** `true` if `MemoryCompressor` had to drop or truncate content to fit the requested token budget. */
  readonly truncated: boolean;
}
