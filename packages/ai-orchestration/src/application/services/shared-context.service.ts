import type { Clock, IdGenerator } from "@rmsm/core";
import type { SharedContextStore } from "../../repositories/shared-context-store.interface";
import type { EventPublisher } from "../../events/event-publisher.interface";
import type { ContextSharedEvent } from "../../events/orchestration-domain-events.interface";

/** The "shared memory" / "shared context" capabilities: a simple
 * key-value blackboard every collaborating agent in an orchestration
 * session reads and writes through the same store, so state set by one
 * agent (the coordinator's plan, a worker's intermediate finding, ...)
 * is visible to the others without a direct message. */
export class SharedContextService {
  constructor(
    private readonly store: SharedContextStore,
    private readonly clock: Clock,
    private readonly idGenerator: IdGenerator,
    private readonly eventPublisher?: EventPublisher,
  ) {}

  async share(key: string, value: unknown, updatedBy: string): Promise<void> {
    await this.store.set(key, value, updatedBy);

    const event: ContextSharedEvent = {
      eventId: this.idGenerator.generate(),
      kind: "ContextShared",
      occurredAt: this.clock.now(),
      aggregateId: key,
      key,
      updatedBy,
    };
    if (this.eventPublisher) {
      await this.eventPublisher.publish([event]);
    }
  }

  async read(key: string): Promise<unknown> {
    return this.store.get(key);
  }

  async snapshot(): Promise<Readonly<Record<string, unknown>>> {
    return this.store.all();
  }
}
