import type { MemoryEntry } from "../../domain/entities/memory-entry.entity";
import type { MemoryQuery } from "../../domain/entities/memory-query.entity";
import type { MemoryResult } from "../../domain/entities/memory-result.entity";
import type { MemoryRepository } from "../../repositories/memory-repository.interface";
import type { Conversation } from "../../domain/entities/conversation.entity";
import type { ConversationRepository } from "../../repositories/conversation-repository.interface";
import type { EventPublisher } from "../../events/event-publisher.interface";
import type { MemoryDomainEvent } from "../../events/memory-domain-events.interface";
import type { Summarizer } from "../../repositories/summarizer.interface";
import type { Clock, IdGenerator } from "@rmsm/core";

/** Shared, real (not mocked-via-library) in-memory test doubles for
 * application-layer service tests — one definition, reused across every
 * service's own test file, instead of each hand-rolling its own. */

export class FakeMemoryRepository implements MemoryRepository {
  private readonly byId = new Map<string, MemoryEntry>();

  async findById(id: string): Promise<MemoryEntry | null> {
    return this.byId.get(id) ?? null;
  }

  async query(query: MemoryQuery): Promise<MemoryResult> {
    let entries = [...this.byId.values()];
    if (query.conversationId !== undefined) entries = entries.filter((e) => e.conversationId === query.conversationId);
    if (query.type !== undefined) entries = entries.filter((e) => e.type === query.type);
    if (query.tags !== undefined) {
      const tags = query.tags;
      entries = entries.filter((e) => e.metadata.tags.some((t) => tags.includes(t)));
    }
    if (query.searchText !== undefined) {
      const needle = query.searchText.toLowerCase();
      entries = entries.filter((e) => e.content.toLowerCase().includes(needle));
    }
    const totalCount = entries.length;
    const limited = query.limit !== undefined ? entries.slice(0, query.limit) : entries;
    return { entries: limited, totalCount, truncated: limited.length < totalCount };
  }

  async save(entry: MemoryEntry): Promise<void> {
    this.byId.set(entry.id, entry);
  }

  async delete(id: string): Promise<void> {
    this.byId.delete(id);
  }

  async deleteExpired(asOf: Date): Promise<number> {
    let removed = 0;
    for (const [id, entry] of this.byId) {
      if (entry.expiresAt && entry.expiresAt <= asOf) {
        this.byId.delete(id);
        removed++;
      }
    }
    return removed;
  }
}

export class FakeConversationRepository implements ConversationRepository {
  private readonly byId = new Map<string, Conversation>();

  async findById(id: string): Promise<Conversation | null> {
    return this.byId.get(id) ?? null;
  }

  async save(conversation: Conversation): Promise<void> {
    this.byId.set(conversation.id, conversation);
  }
}

export class RecordingEventPublisher implements EventPublisher {
  public readonly published: MemoryDomainEvent[] = [];

  async publish(events: readonly MemoryDomainEvent[]): Promise<void> {
    this.published.push(...events);
  }
}

export class FakeSummarizer implements Summarizer {
  async summarize(text: string, targetSentences?: number): Promise<string> {
    const sentenceCount = targetSentences ?? 1;
    return text.split(".").slice(0, sentenceCount).join(".").trim();
  }
}

export class FixedClock implements Clock {
  constructor(private readonly fixed: Date) {}
  now(): Date {
    return this.fixed;
  }
}

export class SequentialIdGenerator implements IdGenerator {
  private counter = 0;
  generate(): string {
    this.counter += 1;
    return `id-${this.counter}`;
  }
}
