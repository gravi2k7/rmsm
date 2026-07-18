import { BaseRepository } from "./base.repository";
import { translatePrismaError } from "../errors/database.errors";
import { paginate, type OffsetPaginationQuery, type PaginatedResult } from "../pagination/pagination";
import type { DbClient, SoftDeletableRepository } from "../interfaces/repository.interface";

/**
 * The minimal structural shape this class needs from a Prisma model
 * delegate (`prisma.user`, `prisma.strategy`, etc.) — a real Prisma
 * delegate satisfies this without any adapter, since it's a subset of
 * what every delegate already exposes. Kept structural (not imported
 * from `@prisma/client`'s own delegate types) because those are complex
 * conditional generics that don't parameterize cleanly over an arbitrary
 * model; this narrow slice is all a generic CRUD layer actually needs.
 */
export interface PrismaModelDelegate<TEntity, TWhereUnique, TWhere, TCreateInput, TUpdateInput> {
  findUnique(args: { where: TWhereUnique }): Promise<TEntity | null>;
  findMany(args: { where?: TWhere; skip: number; take: number }): Promise<TEntity[]>;
  count(args: { where?: TWhere }): Promise<number>;
  create(args: { data: TCreateInput }): Promise<TEntity>;
  update(args: { where: TWhereUnique; data: TUpdateInput }): Promise<TEntity>;
  delete(args: { where: TWhereUnique }): Promise<TEntity>;
}

export interface PrismaRepositoryOptions {
  /** Name used in error messages (`RecordNotFoundError`, etc.) — should
   * read naturally as "<EntityName> (<id>) was not found.", e.g.
   * `"Strategy"`, not `"strategy"` or `"strategies"`. */
  readonly entityName: string;
  /** The client to use when a method is called without an explicit one —
   * matches this platform's own established convention of every
   * repository method defaulting its `client` parameter to the singleton
   * `prisma`. A concrete repository passes its own imported `prisma`
   * here (importing it from `@rmsm/database`'s own root, the same way
   * every existing repository already does) rather than this base class
   * importing the singleton itself, which would create a real circular
   * module dependency with `index.ts` (which re-exports this very file). */
  readonly defaultClient: DbClient;
}

/**
 * The one concrete, Prisma-backed `BaseRepository` implementation this
 * platform actually uses. Generic over the delegate + input shapes so a
 * concrete repository (e.g. a real `UserRepository`) supplies its own
 * `prisma.user` delegate and gets `findById`/`findMany`/`create`/
 * `update`/`delete`/pagination/error-translation for free, layering
 * whatever entity-specific query methods it needs on top rather than
 * reimplementing these primitives.
 *
 * `getDelegate(client)` is abstract rather than a constructor parameter:
 * a Prisma delegate is bound to a specific client instance (`prisma.user`
 * vs `tx.user` inside a transaction), so a concrete repository must be
 * able to resolve "the right delegate for this call's client" rather
 * than being handed one fixed delegate at construction time — the same
 * reason every repository method accepts an optional `client` parameter
 * in the first place.
 */
export abstract class PrismaRepository<TEntity, TId, TWhereUnique, TWhere extends Record<string, unknown>, TCreateInput, TUpdateInput>
  extends BaseRepository<TEntity, TId>
  implements SoftDeletableRepository<TId>
{
  protected readonly defaultClient: DbClient;

  protected constructor(options: PrismaRepositoryOptions) {
    super(options.entityName);
    this.defaultClient = options.defaultClient;
  }

  protected abstract getDelegate(client: DbClient): PrismaModelDelegate<TEntity, TWhereUnique, TWhere, TCreateInput, TUpdateInput>;
  protected abstract idToWhereUnique(id: TId): TWhereUnique;
  /** Builds the `{ deletedAt: new Date() }`-shaped update payload for this
   * entity's own soft-delete column — not every entity names it
   * `deletedAt` (though most in this schema do), so this stays abstract
   * rather than assumed. */
  protected abstract softDeleteData(): TUpdateInput;
  protected abstract restoreData(): TUpdateInput;
  /** Reads whatever field `softDeleteData()` sets, off an already-fetched
   * entity — used by `isDeleted()`. */
  protected abstract isEntityDeleted(entity: TEntity): boolean;

  async findById(id: TId, client?: DbClient): Promise<TEntity | null> {
    try {
      return await this.getDelegate(this.resolveClient(client)).findUnique({ where: this.idToWhereUnique(id) });
    } catch (error) {
      throw translatePrismaError(error, this.entityName);
    }
  }

  async findMany(where: TWhere | undefined, query: OffsetPaginationQuery, client?: DbClient): Promise<PaginatedResult<TEntity>> {
    try {
      return await paginate(this.getDelegate(this.resolveClient(client)), where, query);
    } catch (error) {
      throw translatePrismaError(error, this.entityName);
    }
  }

  async create(data: TCreateInput, client?: DbClient): Promise<TEntity> {
    try {
      return await this.getDelegate(this.resolveClient(client)).create({ data });
    } catch (error) {
      throw translatePrismaError(error, this.entityName);
    }
  }

  async update(id: TId, data: TUpdateInput, client?: DbClient): Promise<TEntity> {
    try {
      return await this.getDelegate(this.resolveClient(client)).update({ where: this.idToWhereUnique(id), data });
    } catch (error) {
      throw translatePrismaError(error, this.entityName);
    }
  }

  /** Hard delete — present because the underlying Prisma delegate always
   * has one, but per this platform's own soft-delete-only convention,
   * concrete repositories for entities with a `deletedAt` column should
   * expose `softDelete()` in their own public API instead and leave this
   * unused. Entities without a soft-delete column (rare in this schema)
   * are the legitimate caller of this method. */
  async delete(id: TId, client?: DbClient): Promise<void> {
    try {
      await this.getDelegate(this.resolveClient(client)).delete({ where: this.idToWhereUnique(id) });
    } catch (error) {
      throw translatePrismaError(error, this.entityName);
    }
  }

  async save(_entity: TEntity, _client?: DbClient): Promise<void> {
    // Generic `save()` can't know create-vs-update for an arbitrary
    // entity shape without a business-specific "does this already
    // exist" rule — deliberately left for a concrete repository to
    // override with real logic (or to simply not use, calling `create`/
    // `update` directly instead, which most of this platform's existing
    // repositories already do). Throwing here documents that choice
    // rather than silently no-op-ing.
    throw new Error(`${this.entityName}Repository.save() has no generic implementation — override it, or call create()/update() directly.`);
  }

  async softDelete(id: TId, client?: DbClient): Promise<void> {
    try {
      await this.getDelegate(this.resolveClient(client)).update({ where: this.idToWhereUnique(id), data: this.softDeleteData() });
    } catch (error) {
      throw translatePrismaError(error, this.entityName);
    }
  }

  async restore(id: TId, client?: DbClient): Promise<void> {
    try {
      await this.getDelegate(this.resolveClient(client)).update({ where: this.idToWhereUnique(id), data: this.restoreData() });
    } catch (error) {
      throw translatePrismaError(error, this.entityName);
    }
  }

  async isDeleted(id: TId, client?: DbClient): Promise<boolean> {
    const entity = await this.getDelegate(this.resolveClient(client)).findUnique({ where: this.idToWhereUnique(id) });
    return entity !== null && this.isEntityDeleted(entity);
  }

  /** `resolveClient` exists as a named seam (rather than inlining
   * `client ?? this.defaultClient` at every call site) specifically so a
   * concrete repository can override it if it ever needs to resolve a
   * default client differently — none do today, but the seam costs
   * nothing and avoids six call sites needing to change together later. */
  protected resolveClient(client: DbClient | undefined): DbClient {
    return client ?? this.defaultClient;
  }
}
