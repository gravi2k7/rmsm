/**
 * Minimal shape every domain event in the platform conforms to. Concrete
 * events (e.g. a future module's own `StrategyCreatedEvent`-style
 * interfaces) extend this with their own payload fields — this file
 * defines no event, just the envelope every one of them shares.
 *
 * Deliberately does not prescribe an integration-event envelope (topic,
 * partition key, delivery guarantees, etc.) — that's a real, larger
 * concern each owning module's own infrastructure layer decides for
 * itself (see e.g. AI-103's own `IntegrationEvent<T>` mapper), not
 * something a dependency-free domain kernel should assume.
 */
export interface DomainEvent {
  /** Unique per occurrence — the same id used for outbox-style
   * deduplication downstream, if the owning module uses one. */
  readonly eventId: string;
  /** Discriminates event payload shape — matches the pattern every event
   * union in this platform already uses (`kind`), not `type`, to avoid
   * colliding with TypeScript's own `type` keyword in destructured code. */
  readonly kind: string;
  readonly occurredAt: Date;
  /** The aggregate that raised this event. */
  readonly aggregateId: string;
}

/** Anything capable of recording domain events raised during a unit of
 * work and yielding them for publishing afterward — the contract
 * `AggregateRoot` implements, exposed separately so infrastructure code
 * can depend on the capability without depending on the concrete base
 * class. */
export interface DomainEventRecorder {
  pullDomainEvents(): readonly DomainEvent[];
}
