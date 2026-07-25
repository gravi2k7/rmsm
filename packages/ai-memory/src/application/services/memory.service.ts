import { SystemClock } from "@rmsm/core";
import type { Clock, IdGenerator } from "@rmsm/core";
import type { MemoryEntry } from "../../domain/entities/memory-entry.entity";
import type { MemoryMetadata } from "../../domain/entities/memory-metadata.entity";
import type { MemoryType } from "../../domain/enums/memory-type.enum";
import { MemoryExpiredError, MemoryNotFoundError, MemoryVersionConflictError } from "../../domain/errors/memory-domain.errors";
import type { MemoryRepository } from "../../repositories/memory-repository.interface";
import type { EventPublisher } from "../../events/event-publisher.interface";
import type { MemoryExpiredEvent, MemoryStoredEvent } from "../../events/memory-domain-events.interface";
import { SystemIdGenerator } from "../system-id-generator";

export interface StoreMemoryParams {
  readonly conversationId?: string | null;
  readonly organizationId?: string | null;
  readonly type: MemoryType;
  readonly content: string;
  readonly metadata: Omit<MemoryMetadata, "id" | "version">;
  readonly expiresAt?: Date | null;
}

export type UpdateMemoryChanges = Partial<Pick<MemoryEntry, "content" | "metadata" | "expiresAt">>;

/**
 * Owns the CRUD-plus-expiration lifecycle of a `MemoryEntry` — storing,
 * fetching (honoring expiration), optimistic-concurrency updates, and
 * both on-demand and swept expiration. `MemoryRetriever` (a separate
 * service) owns querying/searching; this service owns single-entry
 * lifecycle, the same split `packages/database`'s own repository/service
 * layering uses.
 */
export class MemoryService {
  constructor(
    private readonly repository: MemoryRepository,
    private readonly eventPublisher?: EventPublisher,
    private readonly clock: Clock = new SystemClock(),
    private readonly idGenerator: IdGenerator = new SystemIdGenerator(),
  ) {}

  async store(params: StoreMemoryParams): Promise<MemoryEntry> {
    const now = this.clock.now();
    const id = this.idGenerator.generate();
    const entry: MemoryEntry = {
      id,
      conversationId: params.conversationId ?? null,
      organizationId: params.organizationId ?? null,
      type: params.type,
      content: params.content,
      metadata: { ...params.metadata, id, version: 1 },
      version: 1,
      createdAt: now,
      updatedAt: now,
      expiresAt: params.expiresAt ?? null,
    };

    await this.repository.save(entry);

    if (this.eventPublisher) {
      const event: MemoryStoredEvent = {
        eventId: this.idGenerator.generate(),
        kind: "MemoryStored",
        occurredAt: now,
        aggregateId: id,
        memoryEntryId: id,
        memoryType: entry.type,
        conversationId: entry.conversationId,
      };
      await this.eventPublisher.publish([event]);
    }

    return entry;
  }

  /** Fetches an entry, throwing `MemoryExpiredError` if `asOf` (default: now) is at or past its `expiresAt` — expired entries are never silently returned. */
  async get(id: string, asOf: Date = this.clock.now()): Promise<MemoryEntry> {
    const entry = await this.repository.findById(id);
    if (!entry) throw new MemoryNotFoundError(id);
    if (entry.expiresAt && entry.expiresAt <= asOf) throw new MemoryExpiredError(id);
    return entry;
  }

  /** Optimistic-concurrency update — throws `MemoryVersionConflictError` if `expectedVersion` doesn't match the entry's current version. */
  async update(id: string, expectedVersion: number, changes: UpdateMemoryChanges): Promise<MemoryEntry> {
    const existing = await this.get(id);
    if (existing.version !== expectedVersion) {
      throw new MemoryVersionConflictError(id, expectedVersion, existing.version);
    }

    const updated: MemoryEntry = {
      ...existing,
      ...changes,
      version: existing.version + 1,
      updatedAt: this.clock.now(),
    };
    await this.repository.save(updated);
    return updated;
  }

  /** Deletes one entry immediately, raising `MemoryExpired` — for a caller that wants to expire something right now rather than waiting for `purgeExpired`. */
  async expireNow(id: string): Promise<void> {
    const entry = await this.repository.findById(id);
    if (!entry) throw new MemoryNotFoundError(id);

    await this.repository.delete(id);

    if (this.eventPublisher) {
      const event: MemoryExpiredEvent = {
        eventId: this.idGenerator.generate(),
        kind: "MemoryExpired",
        occurredAt: this.clock.now(),
        aggregateId: id,
        memoryEntryId: id,
      };
      await this.eventPublisher.publish([event]);
    }
  }

  /** Sweeps every entry whose `expiresAt` is at or before `asOf` (default: now), returning how many were removed. Does not raise per-entry `MemoryExpired` events — a bulk sweep is an infrastructure-timer concern, not a per-aggregate lifecycle event; a caller that needs per-entry notification should query first and call `expireNow` individually. */
  async purgeExpired(asOf: Date = this.clock.now()): Promise<number> {
    return this.repository.deleteExpired(asOf);
  }
}
