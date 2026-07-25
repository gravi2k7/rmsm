import { Guard, SystemClock } from "@rmsm/core";
import type { Clock, IdGenerator } from "@rmsm/core";
import type { MemoryEntry } from "../../domain/entities/memory-entry.entity";
import type { MemorySummary } from "../../domain/entities/memory-summary.entity";
import type { Summarizer } from "../../repositories/summarizer.interface";
import type { EventPublisher } from "../../events/event-publisher.interface";
import type { MemorySummarizedEvent } from "../../events/memory-domain-events.interface";
import { SystemIdGenerator } from "../system-id-generator";
import { estimateTokenCount } from "../token-estimator";

export interface SummarizeParams {
  readonly conversationId: string | null;
  readonly sourceEntries: readonly MemoryEntry[];
  readonly targetSentences?: number;
}

/**
 * "Memory Summarization" — condenses one or more `MemoryEntry`s into a
 * `MemorySummary` via a pluggable `Summarizer` (see
 * `repositories/summarizer.interface.ts` for why this is a port, not a
 * concrete LLM call). This service owns the orchestration
 * (concatenation, event raising, id/timestamp assignment); the actual
 * text-condensing algorithm is entirely the injected `Summarizer`'s
 * concern.
 */
export class MemorySummarizer {
  constructor(
    private readonly summarizer: Summarizer,
    private readonly eventPublisher?: EventPublisher,
    private readonly clock: Clock = new SystemClock(),
    private readonly idGenerator: IdGenerator = new SystemIdGenerator(),
  ) {}

  async summarize(params: SummarizeParams): Promise<MemorySummary> {
    Guard.againstEmptyArray(params.sourceEntries, "sourceEntries");

    const combinedText = params.sourceEntries.map((entry) => entry.content).join("\n\n");
    const summaryText = await this.summarizer.summarize(combinedText, params.targetSentences);

    const now = this.clock.now();
    const id = this.idGenerator.generate();
    const summary: MemorySummary = {
      id,
      conversationId: params.conversationId,
      sourceMemoryEntryIds: params.sourceEntries.map((entry) => entry.id),
      summary: summaryText,
      createdAt: now,
      estimatedTokenCount: estimateTokenCount(summaryText),
    };

    if (this.eventPublisher) {
      const event: MemorySummarizedEvent = {
        eventId: this.idGenerator.generate(),
        kind: "MemorySummarized",
        occurredAt: now,
        aggregateId: id,
        summaryId: id,
        sourceMemoryEntryIds: summary.sourceMemoryEntryIds,
      };
      await this.eventPublisher.publish([event]);
    }

    return summary;
  }
}
