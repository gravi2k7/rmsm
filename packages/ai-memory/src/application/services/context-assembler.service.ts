import type { ConversationMessage } from "../../domain/entities/conversation-message.entity";
import type { MemoryEntry } from "../../domain/entities/memory-entry.entity";
import type { MemoryContext } from "../../domain/entities/memory-context.entity";
import { MemoryCompressor } from "./memory-compressor.service";
import { estimateTokenCount } from "../token-estimator";

export interface AssembleContextParams {
  readonly conversationId: string | null;
  /** Recent conversation turns, oldest first. */
  readonly messages: readonly ConversationMessage[];
  /** Longer-lived memory entries relevant to this conversation/turn — typically `MemoryRetriever`'s own output. */
  readonly memoryEntries: readonly MemoryEntry[];
  readonly maxTokens: number;
}

/**
 * Builds the one `MemoryContext` a caller hands off to a provider
 * request — folding relevant memory entries into a single
 * `systemContext` string and keeping conversation turns verbatim,
 * fitting both within `maxTokens` via `MemoryCompressor`. This is the
 * ONE place that assembly happens; nothing else in a consumer of this
 * package should hand-roll its own context string from raw entries and
 * messages.
 */
export class ContextAssembler {
  constructor(private readonly compressor: MemoryCompressor = new MemoryCompressor()) {}

  assemble(params: AssembleContextParams): MemoryContext {
    const compressed = this.compressor.compress({
      entries: params.memoryEntries,
      messages: params.messages,
      maxTokens: params.maxTokens,
    });

    const systemContext = compressed.entries.map((entry) => entry.content).join("\n\n");
    const messageTokens = compressed.messages.reduce((sum, message) => sum + estimateTokenCount(message.content), 0);

    return {
      conversationId: params.conversationId,
      systemContext,
      messages: compressed.messages,
      includedMemoryEntryIds: compressed.entries.map((entry) => entry.id),
      estimatedTokenCount: estimateTokenCount(systemContext) + messageTokens,
      truncated: compressed.truncated,
    };
  }
}
