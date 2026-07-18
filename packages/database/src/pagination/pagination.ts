/**
 * Offset-based pagination — the exact shape already hand-duplicated
 * across at least 7 repository files in `apps/api` (market-data,
 * notifications, billing, organizations each declare their own
 * `PageParams`/`PaginatedResult`). This is the canonical version: same
 * field names, same defaults, so existing call sites can adopt it as a
 * drop-in replacement for their own local copy without a shape change —
 * migrating those existing files isn't done as part of this change
 * (out of this package's own scope, and each is its own small, low-risk
 * follow-up rather than one large cross-cutting edit bundled in here),
 * but this is now the one place that shape is actually defined.
 *
 * True cursor (keyset) pagination — "give me records after id X" — is a
 * genuinely different mechanism (stable under concurrent writes, unlike
 * offset pagination's "page 2 skips or repeats a row" problem) and isn't
 * implemented here; a real, named gap for a future addition to this
 * module, not silently approximated with a fake cursor built from an
 * offset.
 */

export interface OffsetPaginationQuery {
  readonly page?: number;
  readonly pageSize?: number;
}

export interface PaginationMeta {
  readonly page: number;
  readonly pageSize: number;
  readonly totalCount: number;
  readonly totalPages: number;
  readonly hasNextPage: boolean;
  readonly hasPreviousPage: boolean;
}

export interface PaginatedResult<T> {
  readonly data: T[];
  readonly pagination: PaginationMeta;
}

export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 500;

export interface SkipTakeParams {
  readonly take: number;
  readonly skip: number;
  readonly page: number;
  readonly pageSize: number;
}

/** Normalizes a possibly-absent/out-of-range page/pageSize into safe,
 * bounded values and the `skip`/`take` a Prisma `findMany` call needs. */
export function toSkipTake(query: OffsetPaginationQuery): SkipTakeParams {
  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, query.pageSize ?? DEFAULT_PAGE_SIZE));
  return { take: pageSize, skip: (page - 1) * pageSize, page, pageSize };
}

export function buildPaginatedResult<T>(data: T[], totalCount: number, page: number, pageSize: number): PaginatedResult<T> {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  return {
    data,
    pagination: {
      page,
      pageSize,
      totalCount,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
}

/**
 * Runs a `findMany` + `count` pair against any object exposing that
 * shape (a Prisma delegate structurally satisfies this without any
 * explicit adapter) and assembles the result — the common "give me one
 * page of X matching this filter" operation every paginated repository
 * method otherwise repeats by hand.
 */
export interface CountableFindManyDelegate<TWhere, TEntity> {
  findMany(args: { where?: TWhere; skip: number; take: number }): Promise<TEntity[]>;
  count(args: { where?: TWhere }): Promise<number>;
}

export async function paginate<TWhere, TEntity>(
  delegate: CountableFindManyDelegate<TWhere, TEntity>,
  where: TWhere | undefined,
  query: OffsetPaginationQuery,
): Promise<PaginatedResult<TEntity>> {
  const { skip, take, page, pageSize } = toSkipTake(query);
  const [data, totalCount] = await Promise.all([delegate.findMany({ where, skip, take }), delegate.count({ where })]);
  return buildPaginatedResult(data, totalCount, page, pageSize);
}
