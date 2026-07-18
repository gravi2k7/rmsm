import { RecordNotFoundError } from "../errors/database.errors";
import type { DatabaseRepository, DbClient } from "../interfaces/repository.interface";

/**
 * Abstract base every concrete repository extends. Deliberately ORM-
 * agnostic at this level — no Prisma import here at all — so the
 * "generic repository abstraction" requirement is satisfied independently
 * of which persistence technology backs a given concrete repository.
 * `PrismaRepository` (see `prisma.repository.ts`) is the one concrete,
 * Prisma-backed implementation this platform actually uses today; a
 * different backing store would extend `BaseRepository` directly instead.
 *
 * Provides no business logic — only the small set of genuinely mechanical
 * helpers every repository needs regardless of what it persists:
 * `getOrThrow()` (the "find or raise a real domain error" pattern used
 * everywhere else in this platform already, e.g. `NotFoundError` in
 * `@rmsm/shared`), and the abstract shape a concrete repository fills in.
 */
export abstract class BaseRepository<TEntity, TId> implements DatabaseRepository<TEntity, TId> {
  protected constructor(protected readonly entityName: string) {}

  abstract findById(id: TId, client?: DbClient): Promise<TEntity | null>;
  abstract save(entity: TEntity, client?: DbClient): Promise<void>;

  /** `findById()`, but throws `RecordNotFoundError` instead of returning
   * `null` — for call sites where "this must exist" is itself the
   * expected precondition (e.g. an update handler that already
   * authorized access to a specific, known id). */
  async getOrThrow(id: TId, client?: DbClient): Promise<TEntity> {
    const entity = await this.findById(id, client);
    if (!entity) throw new RecordNotFoundError(this.entityName, String(id));
    return entity;
  }
}
