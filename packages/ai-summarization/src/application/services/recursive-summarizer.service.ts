import type { IdGenerator, Clock } from "@rmsm/core";
import type { Summarizer } from "@rmsm/ai-memory";
import type { RecursiveSummary } from "../../domain/entities/recursive-summary.entity";
import { EmptyContentError, InvalidSummarizationOptionsError, SummarizationDidNotConvergeError } from "../../domain/errors/summarization-domain.errors";
import { splitIntoChunks } from "./text-chunker.util";
import type { EventPublisher } from "../../events/event-publisher.interface";
import type { ChunkSummarizedEvent, RecursiveSummarizationCompletedEvent, SummarizationDomainEvent } from "../../events/summarization-domain-events.interface";

export interface RecursiveSummarizationOptions {
  readonly maxInputChars: number;
  readonly maxRounds?: number;
}

const DEFAULT_MAX_ROUNDS = 5;

/**
 * Summarizes text of any length by repeatedly chunking + summarizing:
 * split into pieces under `maxInputChars`, summarize each piece via
 * the injected `Summarizer` — deliberately `@rmsm/ai-memory`'s own
 * port/`HeuristicSummarizer`, reused rather than rebuilt (per "no
 * duplicated logic") — concatenate the results, and recurse on the
 * concatenation if it's still too long, up to `maxRounds`. This is the
 * "recursive summarization" capability; `HierarchicalSummarizer` below
 * is the sibling capability that keeps every intermediate level
 * instead of only the final text.
 */
export class RecursiveSummarizer {
  constructor(
    private readonly summarizer: Summarizer,
    private readonly clock: Clock,
    private readonly idGenerator: IdGenerator,
    private readonly eventPublisher?: EventPublisher,
  ) {}

  async summarize(text: string, options: RecursiveSummarizationOptions): Promise<RecursiveSummary> {
    if (!text.trim()) {
      throw new EmptyContentError();
    }
    if (options.maxInputChars <= 0) {
      throw new InvalidSummarizationOptionsError("maxInputChars must be positive");
    }
    const maxRounds = options.maxRounds ?? DEFAULT_MAX_ROUNDS;

    let current = text;
    let round = 0;

    while (current.length > options.maxInputChars) {
      if (round >= maxRounds) {
        throw new SummarizationDidNotConvergeError(maxRounds);
      }
      const chunks = splitIntoChunks(current, options.maxInputChars);
      const summaries: string[] = [];
      for (let i = 0; i < chunks.length; i++) {
        summaries.push(await this.summarizer.summarize(chunks[i]!));
        await this.publish([this.chunkSummarizedEvent(i)]);
      }
      current = summaries.join(" ");
      round += 1;
    }

    if (round === 0) {
      // Already under budget — still run it through the summarizer once
      // so the result is a genuine summary, not a pass-through of the
      // original text.
      current = await this.summarizer.summarize(current);
      round = 1;
    }

    await this.publish([this.completedEvent(round)]);
    return { summary: current, roundsUsed: round };
  }

  private chunkSummarizedEvent(chunkIndex: number): ChunkSummarizedEvent {
    return { eventId: this.idGenerator.generate(), kind: "ChunkSummarized", occurredAt: this.clock.now(), aggregateId: String(chunkIndex), chunkIndex };
  }

  private completedEvent(roundsUsed: number): RecursiveSummarizationCompletedEvent {
    return { eventId: this.idGenerator.generate(), kind: "RecursiveSummarizationCompleted", occurredAt: this.clock.now(), aggregateId: this.idGenerator.generate(), roundsUsed };
  }

  private async publish(events: readonly SummarizationDomainEvent[]): Promise<void> {
    if (this.eventPublisher) {
      await this.eventPublisher.publish(events);
    }
  }
}
