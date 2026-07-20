import type { PaginationMeta } from "@/types/strategy";

export function paginateClientSide<T>(items: readonly T[], page: number, pageSize: number): { pageItems: T[]; meta: PaginationMeta } {
  const totalCount = items.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const clampedPage = Math.min(Math.max(1, page), totalPages);
  const start = (clampedPage - 1) * pageSize;
  const pageItems = items.slice(start, start + pageSize);

  return {
    pageItems,
    meta: {
      page: clampedPage,
      pageSize,
      totalCount,
      totalPages,
      hasNextPage: clampedPage < totalPages,
      hasPreviousPage: clampedPage > 1,
    },
  };
}
