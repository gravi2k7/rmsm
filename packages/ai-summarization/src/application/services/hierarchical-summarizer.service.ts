import type { IdGenerator, Clock } from "@rmsm/core";
import type { Summarizer } from "@rmsm/ai-memory";
import type { SummaryNode } from "../../domain/entities/summary-node.entity";
import type { HierarchicalSummary } from "../../domain/entities/hierarchical-summary.entity";
import { EmptyContentError, InvalidSummarizationOptionsError } from "../../domain/errors/summarization-domain.errors";
import { splitIntoChunks } from "./text-chunker.util";
import type { EventPublisher } from "../../events/event-publisher.interface";
import type { LevelSummarizedEvent, SummarizationDomainEvent } from "../../events/summarization-domain-events.interface";

export interface HierarchicalSummarizationOptions {
  readonly maxChunkChars: number;
  readonly nodesPerGroup?: number;
}

const DEFAULT_NODES_PER_GROUP = 3;

/**
 * The sibling of `RecursiveSummarizer`: builds and returns the FULL
 * tree of intermediate summaries (level 0 = one summary per raw
 * chunk, level 1 = summaries of groups of level-0 summaries, and so
 * on until one node remains), not just the final rolled-up text — for
 * callers that want to display or drill into intermediate levels
 * (e.g. "show me the summary of just section 3"), which
 * `RecursiveSummarizer` deliberately doesn't expose.
 */
export class HierarchicalSummarizer {
  constructor(
    private readonly summarizer: Summarizer,
    private readonly clock: Clock,
    private readonly idGenerator: IdGenerator,
    private readonly eventPublisher?: EventPublisher,
  ) {}

  async summarize(text: string, options: HierarchicalSummarizationOptions): Promise<HierarchicalSummary> {
    if (!text.trim()) {
      throw new EmptyContentError();
    }
    if (options.maxChunkChars <= 0) {
      throw new InvalidSummarizationOptionsError("maxChunkChars must be positive");
    }
    const groupSize = options.nodesPerGroup ?? DEFAULT_NODES_PER_GROUP;
    if (groupSize < 2) {
      throw new InvalidSummarizationOptionsError("nodesPerGroup must be at least 2");
    }

    const chunks = splitIntoChunks(text, options.maxChunkChars);
    const levels: SummaryNode[][] = [];

    let currentLevel: SummaryNode[] = [];
    for (let i = 0; i < chunks.length; i++) {
      currentLevel.push({ level: 0, text: await this.summarizer.summarize(chunks[i]!), sourceChunkIndices: [i] });
    }
    levels.push(currentLevel);
    await this.publish([this.levelEvent(0, currentLevel.length)]);

    let level = 1;
    while (currentLevel.length > 1) {
      const nextLevel: SummaryNode[] = [];
      for (let i = 0; i < currentLevel.length; i += groupSize) {
        const group = currentLevel.slice(i, i + groupSize);
        const combinedText = group.map((node) => node.text).join(" ");
        const summarized = await this.summarizer.summarize(combinedText);
        nextLevel.push({
          level,
          text: summarized,
          sourceChunkIndices: group.flatMap((node) => node.sourceChunkIndices),
        });
      }
      levels.push(nextLevel);
      await this.publish([this.levelEvent(level, nextLevel.length)]);
      currentLevel = nextLevel;
      level += 1;
    }

    return { levels, rootSummary: currentLevel[0]!.text };
  }

  private levelEvent(level: number, nodeCount: number): LevelSummarizedEvent {
    return { eventId: this.idGenerator.generate(), kind: "LevelSummarized", occurredAt: this.clock.now(), aggregateId: `level-${level}`, level, nodeCount };
  }

  private async publish(events: readonly SummarizationDomainEvent[]): Promise<void> {
    if (this.eventPublisher) {
      await this.eventPublisher.publish(events);
    }
  }
}
