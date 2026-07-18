import { Entity } from "./entity";
import type { DomainEvent, DomainEventRecorder } from "../events/domain-event";

/**
 * Abstract base for aggregate roots: an `Entity` that additionally
 * records domain events raised by its own methods during a unit of work,
 * for an application-layer command handler to pull and publish after a
 * successful save — the same "collect during the operation, publish after
 * persistence succeeds" shape AI-103's own outbox pattern assumes upstream
 * of it, without this base class knowing anything about outboxes,
 * transactions, or publishing itself.
 */
export abstract class AggregateRoot<TId> extends Entity<TId> implements DomainEventRecorder {
  private domainEvents: DomainEvent[] = [];

  /** Concrete aggregate methods call this when a domain event should be
   * raised as a result of the operation just performed. */
  protected addDomainEvent(event: DomainEvent): void {
    this.domainEvents.push(event);
  }

  /** Returns and clears every event recorded since the last pull —
   * one-shot, so a handler can't accidentally re-publish the same batch
   * twice from the same in-memory aggregate instance. */
  public pullDomainEvents(): readonly DomainEvent[] {
    const events = this.domainEvents;
    this.domainEvents = [];
    return events;
  }
}
