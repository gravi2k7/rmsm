/**
 * Abstract base for entities: identified by `id`, not by attribute
 * equality (the opposite of `ValueObject`). Concrete entities (a future
 * module's own domain classes) extend this — this file models no domain
 * concept itself.
 */
export abstract class Entity<TId> {
  public readonly id: TId;

  protected constructor(id: TId) {
    this.id = id;
  }

  /** Identity equality — two entities are the same entity if their ids
   * match, even if every other field differs (e.g. one is a stale copy). */
  public equals(other: Entity<TId> | null | undefined): boolean {
    if (other === null || other === undefined) return false;
    if (other === this) return true;
    if (other.constructor !== this.constructor) return false;
    return Object.is(this.id, other.id);
  }
}
