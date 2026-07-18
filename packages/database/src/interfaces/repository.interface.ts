import type { PrismaClient, Prisma } from "@prisma/client";
import type { Repository as CoreRepository } from "@rmsm/core";
import { OptimisticLockError } from "../errors/database.errors";

/**
 * Every repository accepts an optional transaction client as its final
 * parameter, defaulting to the singleton `prisma` — the established
 * platform convention already documented in this package's own
 * `index.ts` (see the comment above the existing `DbClient` export
 * there). Redeclared here, identically, rather than imported from
 * `../index` — `index.ts` will re-export everything in this file via
 * `export * from "./interfaces"`, and a type-only import back from
 * `../index` into a file `index.ts` itself re-exports is exactly the
 * shape of circular import this package's own architecture avoids
 * elsewhere. The duplication is one line, not a logic risk.
 */
export type DbClient = PrismaClient | Prisma.TransactionClient;

/**
 * The generic repository contract every concrete repository in this
 * package (and, going forward, in `apps/api`) can implement — extends
 * `@rmsm/core`'s own framework-agnostic `Repository<TEntity, TId>`
 * rather than redefining an equivalent shape, so a repository built
 * against this interface is also structurally a valid `@rmsm/core`
 * `Repository`. Adds the one thing genuinely specific to a Prisma-backed
 * repository in this platform: transaction-client participation.
 */
export interface DatabaseRepository<TEntity, TId> extends CoreRepository<TEntity, TId> {
  findById(id: TId, client?: DbClient): Promise<TEntity | null>;
  save(entity: TEntity, client?: DbClient): Promise<void>;
}

/**
 * A repository whose entity supports soft delete — `delete()` marks the
 * record deleted (setting a `deletedAt`-shaped column) rather than
 * removing the row, matching the platform's own established convention:
 * "Soft delete only — no module has hard deletes." Deliberately a
 * separate, opt-in interface rather than baked into `DatabaseRepository`
 * itself — not every entity in this schema has a `deletedAt` column (and
 * shouldn't be forced to pretend it does just to satisfy this contract).
 */
export interface SoftDeletableRepository<TId> {
  softDelete(id: TId, client?: DbClient): Promise<void>;
  restore(id: TId, client?: DbClient): Promise<void>;
  /** Whether the given id currently resolves to a soft-deleted record —
   * for callers that need to distinguish "never existed" from "existed,
   * but deleted" without a full `findById` (which excludes deleted rows
   * by convention). */
  isDeleted(id: TId, client?: DbClient): Promise<boolean>;
}

/**
 * An entity carrying an optimistic-locking `version` column. Extensible
 * hook, not a mandate: most entities in this schema don't need optimistic
 * locking (Prisma's own transactions already serialize conflicting writes
 * correctly for the common case) — this is for the specific entities
 * where two concurrent updates to the *same row* need to fail loudly
 * rather than silently last-write-wins.
 */
export interface VersionedEntity {
  readonly version: number;
}

/** Throws `OptimisticLockError` (see `errors/database.errors.ts`) if
 * `expectedVersion` doesn't match the entity's own current version —
 * call this before issuing an update whose `where` clause should also
 * include `version: expectedVersion` (so the actual race is caught at
 * the database level too; this is the fast, readable pre-check, not the
 * only guard). */
export function assertVersionMatches<T extends VersionedEntity>(entityName: string, id: string, current: T, expectedVersion: number): void {
  if (current.version !== expectedVersion) {
    throw new OptimisticLockError(entityName, id);
  }
}
