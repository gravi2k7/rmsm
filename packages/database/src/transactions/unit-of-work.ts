import type { DomainEvent, DomainEventRecorder } from "@rmsm/core";
import type { DbClient } from "../interfaces/repository.interface";
import type { TransactionManager } from "./transaction.manager";

/**
 * Distinct from `TransactionManager`: a `TransactionManager.run()` call
 * wraps one ad hoc callback in a transaction. A `UnitOfWork` accumulates
 * a *batch* of operations (typically one or more repository `save()`
 * calls) plus the aggregates that raised domain events during those
 * operations, then commits everything atomically and hands back the
 * events for the caller to publish — the exact "collect during the
 * operation, publish after persistence succeeds" shape `@rmsm/core`'s own
 * `AggregateRoot` docstring describes, made concrete here as the
 * mechanism that actually drives it.
 *
 * No business logic: this class has no idea what a "strategy" or a
 * "user" is — it only orchestrates operations and events the caller
 * registers, the same neutral, generic role a Unit of Work always plays.
 */
export class UnitOfWork {
  private readonly operations: Array<(client: DbClient) => Promise<void>> = [];
  private readonly eventSources: DomainEventRecorder[] = [];

  /** Registers a piece of work to run inside the eventual transaction —
   * typically `(client) => repository.save(entity, client)`. */
  register(operation: (client: DbClient) => Promise<void>): void {
    this.operations.push(operation);
  }

  /** Registers an aggregate whose recorded domain events should be
   * collected (via `pullDomainEvents()`) once the transaction commits
   * successfully — not before, so an event is never emitted for a write
   * that ultimately rolled back. */
  trackForEvents(aggregate: DomainEventRecorder): void {
    this.eventSources.push(aggregate);
  }

  /** Runs every registered operation inside one transaction (via the
   * supplied `TransactionManager`), then — only after that transaction
   * has actually committed — pulls and returns every event every tracked
   * aggregate recorded. Clears its own state afterward, so a `UnitOfWork`
   * instance is safe to reuse for a second, unrelated batch. */
  async commit(transactionManager: TransactionManager): Promise<readonly DomainEvent[]> {
    const operations = this.operations;
    await transactionManager.run(async (client) => {
      for (const operation of operations) {
        await operation(client);
      }
    });

    const events = this.eventSources.flatMap((source) => source.pullDomainEvents());
    this.operations.length = 0;
    this.eventSources.length = 0;
    return events;
  }
}
