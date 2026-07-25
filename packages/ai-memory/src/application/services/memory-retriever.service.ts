import { SystemClock } from "@rmsm/core";
import type { Clock } from "@rmsm/core";
import type { MemoryQuery } from "../../domain/entities/memory-query.entity";
import type { MemoryResult } from "../../domain/entities/memory-result.entity";
import type { MemoryRepository } from "../../repositories/memory-repository.interface";
import type { EventPublisher } from "../../events/event-publisher.interface";
import type { MemoryRetrievedEvent } from "../../events/memory-domain-events.interface";
import { InvalidMemoryQueryError } from "../../domain/errors/memory-domain.errors";
import { SystemIdGenerator } from "../system-id-generator";
import type { IdGenerator } from "@rmsm/core";

/**
 * The one path for "Memory Retrieval" — application code (and, later, a
 * real `VectorStoreProvider`-backed search) goes through this, not
 * `MemoryRepository.query()` directly, so a `MemoryRetrieved` event is
 * always raised alongside every real retrieval, without every caller
 * having to remember to raise it themselves.
 */
export class MemoryRetriever {
  constructor(
    private readonly repository: MemoryRepository,
    private readonly eventPublisher?: EventPublisher,
    private readonly clock: Clock = new SystemClock(),
    private readonly idGenerator: IdGenerator = new SystemIdGenerator(),
  ) {}

  async retrieve(query: MemoryQuery): Promise<MemoryResult> {
    if (query.limit !== undefined && query.limit <= 0) {
      throw new InvalidMemoryQueryError("limit must be a positive number.");
    }

    const result = await this.repository.query(query);

    if (this.eventPublisher && result.entries.length > 0) {
      const firstEntry = result.entries[0];
      if (firstEntry) {
        const event: MemoryRetrievedEvent = {
          eventId: this.idGenerator.generate(),
          kind: "MemoryRetrieved",
          occurredAt: this.clock.now(),
          aggregateId: firstEntry.id,
          memoryEntryIds: result.entries.map((entry) => entry.id),
          searchText: query.searchText ?? null,
        };
        await this.eventPublisher.publish([event]);
      }
    }

    return result;
  }
}
