import type { MemoryEntry } from "../../domain/entities/memory-entry.entity";
import type { ConversationMessage } from "../../domain/entities/conversation-message.entity";
import { MemoryCompressionError } from "../../domain/errors/memory-domain.errors";
import { estimateTokenCount } from "../token-estimator";

export interface CompressInput {
  readonly entries: readonly MemoryEntry[];
  /** Conversation turns, oldest first (the natural order `Conversation.messages` already holds them in). */
  readonly messages: readonly ConversationMessage[];
  readonly maxTokens: number;
}

export interface CompressOutput {
  readonly entries: readonly MemoryEntry[];
  readonly messages: readonly ConversationMessage[];
  readonly truncated: boolean;
}

/**
 * Fits a set of memory entries and conversation messages into a token
 * budget — real, working, structural compression (drop what doesn't
 * fit), not summarization (that's `MemorySummarizer`'s job; the two are
 * deliberately separate services, per the spec listing them
 * individually). Two independent priority rules, applied in this order:
 *  1. Conversation messages are kept most-recent-first — the most
 *     recent turns are almost always the most relevant to what happens
 *     next, so older turns are the first thing dropped under pressure.
 *  2. Memory entries are kept highest-`metadata.importance`-first
 *     (undeclared importance defaults to neutral, 0.5) — a caller that
 *     never sets `importance` gets a stable but arbitrary-ish order
 *     (declaration order), which is an honest reflection of not having
 *     expressed a real preference.
 */
export class MemoryCompressor {
  compress(input: CompressInput): CompressOutput {
    if (input.maxTokens <= 0) {
      throw new MemoryCompressionError("maxTokens must be a positive number.");
    }

    let budget = input.maxTokens;
    let truncated = false;

    const keptMessages: ConversationMessage[] = [];
    for (let i = input.messages.length - 1; i >= 0; i--) {
      const message = input.messages[i];
      if (!message) continue;
      const cost = estimateTokenCount(message.content);
      if (cost <= budget) {
        keptMessages.unshift(message);
        budget -= cost;
      } else {
        truncated = true;
      }
    }

    const sortedEntries = [...input.entries].sort((a, b) => (b.metadata.importance ?? 0.5) - (a.metadata.importance ?? 0.5));
    const keptEntries: MemoryEntry[] = [];
    for (const entry of sortedEntries) {
      const cost = estimateTokenCount(entry.content);
      if (cost <= budget) {
        keptEntries.push(entry);
        budget -= cost;
      } else {
        truncated = true;
      }
    }

    return { entries: keptEntries, messages: keptMessages, truncated };
  }
}
