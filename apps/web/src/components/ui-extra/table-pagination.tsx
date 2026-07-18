import { Button } from "@rmsm/ui";
import type { PaginationMeta } from "@/types/strategy";

export function TablePagination({ pagination, onPageChange }: { pagination: PaginationMeta; onPageChange: (page: number) => void }) {
  return (
    <nav aria-label="Pagination" className="flex items-center justify-between border-t px-3 py-3">
      <p className="text-sm text-muted-foreground">
        Page {pagination.page} of {Math.max(pagination.totalPages, 1)} &middot; {pagination.totalCount} total
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={!pagination.hasPreviousPage}
          onClick={() => onPageChange(pagination.page - 1)}
        >
          Previous
        </Button>
        <Button variant="outline" size="sm" disabled={!pagination.hasNextPage} onClick={() => onPageChange(pagination.page + 1)}>
          Next
        </Button>
      </div>
    </nav>
  );
}
