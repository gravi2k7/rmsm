"use client";

import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from "@tanstack/react-table";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@rmsm/ui";
import { LoadingState, ErrorState, EmptyState } from "./data-states";

export interface DataTableProps<TData> {
  columns: ColumnDef<TData, unknown>[];
  data: TData[] | undefined;
  isLoading: boolean;
  error?: unknown;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  /** Row click navigation — most admin list views drill into a detail
   * page; keeping this optional rather than mandatory covers the tables
   * that don't (e.g. a read-only audit log). */
  onRowClick?: (row: TData) => void;
}

export function DataTable<TData>({
  columns,
  data,
  isLoading,
  error,
  onRetry,
  emptyTitle = "Nothing here yet",
  emptyDescription,
  onRowClick,
}: DataTableProps<TData>) {
  const table = useReactTable({
    data: data ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={onRetry} />;
  if (!data || data.length === 0) return <EmptyState title={emptyTitle} description={emptyDescription} />;

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>{header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}</TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow
              key={row.id}
              onClick={onRowClick ? () => onRowClick(row.original) : undefined}
              className={onRowClick ? "cursor-pointer" : undefined}
              tabIndex={onRowClick ? 0 : undefined}
              onKeyDown={
                onRowClick
                  ? (e) => {
                      if (e.key === "Enter") onRowClick(row.original);
                    }
                  : undefined
              }
            >
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
