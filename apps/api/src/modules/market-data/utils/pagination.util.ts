/**
 * Reusable pagination — offset-based, backed by the existing
 * take/skip-based repository methods from Phase 2A (no repository
 * changes this phase, per Phase 4's explicit scope). True cursor
 * (keyset) pagination — "give me records after id X," typically
 * implemented as a `WHERE id > cursor ORDER BY id LIMIT n` query — needs
 * repository support none of the current methods expose; implementing
 * it here by faking a cursor out of an offset would misrepresent what
 * cursor pagination is actually for (stable pagination under concurrent
 * writes, without the "page 2 skips or repeats a row" problem offset
 * pagination has). Flagged as a real, named gap for a future phase that
 * revisits the repository layer, not silently worked around.
 */

export interface OffsetPaginationQuery {
  page?: number;
  pageSize?: number;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: PaginationMeta;
}

export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 500;

export function toPageParams(query: OffsetPaginationQuery): { take: number; skip: number; page: number; pageSize: number } {
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
