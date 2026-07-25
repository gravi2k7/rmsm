/**
 * The five memory capabilities AI-203's own spec names, unified into one
 * discriminator so `MemoryEntry.type` (and `MemoryQuery.type` filtering)
 * has a single, closed vocabulary rather than one enum per capability.
 * `CONVERSATION` covers per-turn conversational memory; the rest match
 * the spec's own capability names one-to-one.
 */
export enum MemoryType {
  CONVERSATION = "CONVERSATION",
  SESSION = "SESSION",
  WORKING = "WORKING",
  SEMANTIC = "SEMANTIC",
  LONG_TERM = "LONG_TERM",
}

export const MEMORY_TYPES = Object.values(MemoryType) as readonly MemoryType[];

/**
 * The three roles a `ConversationMessage` can carry — deliberately a
 * SUBSET of AI-202's own `PromptType` message-role values (`SYSTEM`,
 * `USER`, `ASSISTANT`), not a re-export of it: this package has no
 * dependency on `@rmsm/ai-prompts` (a memory platform storing
 * conversation turns has no reason to depend on a prompt-templating
 * package), so the two enums are intentionally, independently defined —
 * structurally compatible by convention, not by a shared import.
 */
export enum MessageRole {
  SYSTEM = "SYSTEM",
  USER = "USER",
  ASSISTANT = "ASSISTANT",
}

export const MESSAGE_ROLES = Object.values(MessageRole) as readonly MessageRole[];
