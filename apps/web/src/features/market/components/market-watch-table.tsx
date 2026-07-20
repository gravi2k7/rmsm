"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { flexRender, getCoreRowModel, getSortedRowModel, useReactTable, type ColumnDef, type SortingState } from "@tanstack/react-table";
import { Star, LineChart as LineChartIcon, ArrowUpDown } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Button, Badge, Skeleton } from "@rmsm/ui";
import { cn } from "@rmsm/ui";
import type { Instrument, Quote } from "../types";
import { toNumber } from "../types";
import { useWatchlistStore } from "@/features/watchlists/store";

export interface MarketWatchRow {
  instrument: Instrument;
  quote: Quote | undefined;
}

function StatusBadge({ status }: { status: Instrument["status"] }) {
  const variant = status === "ACTIVE" ? "default" : status === "SUSPENDED" ? "secondary" : "outline";
  return <Badge variant={variant}>{status}</Badge>;
}

function PriceCell({ value, precision = 5 }: { value: number | null; precision?: number }) {
  if (value === null) return <span className="text-muted-foreground">—</span>;
  return <span className="tabular-nums">{value.toFixed(precision)}</span>;
}

export function MarketWatchTable({ rows, isLoading }: { rows: MarketWatchRow[]; isLoading: boolean }) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const favorites = useWatchlistStore((s) => s.favoriteInstrumentIds);
  const toggleFavorite = useWatchlistStore((s) => s.toggleFavorite);
  const activeWatchlistId = useWatchlistStore((s) => s.activeWatchlistId);
  const addToWatchlist = useWatchlistStore((s) => s.addToWatchlist);

  const columns = useMemo<ColumnDef<MarketWatchRow>[]>(
    () => [
      {
        id: "favorite",
        header: "",
        enableSorting: false,
        cell: ({ row }) => {
          const isFavorite = favorites.includes(row.original.instrument.id);
          return (
            <button
              type="button"
              onClick={() => toggleFavorite(row.original.instrument.id)}
              aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
              aria-pressed={isFavorite}
              className="text-muted-foreground hover:text-foreground"
            >
              <Star className={cn("h-4 w-4", isFavorite && "fill-warning text-warning")} aria-hidden="true" />
            </button>
          );
        },
      },
      {
        accessorFn: (row) => row.instrument.symbol,
        id: "symbol",
        header: "Symbol",
        cell: ({ row }) => (
          <div>
            <div className="font-medium">{row.original.instrument.symbol}</div>
            <div className="text-xs text-muted-foreground">{row.original.instrument.name}</div>
          </div>
        ),
      },
      {
        accessorFn: (row) => row.instrument.assetClass,
        id: "assetClass",
        header: "Class",
        cell: ({ getValue }) => <Badge variant="outline">{getValue<string>()}</Badge>,
      },
      {
        accessorFn: (row) => toNumber(row.quote?.lastPrice) ?? 0,
        id: "last",
        header: "Last",
        cell: ({ row }) => <PriceCell value={toNumber(row.original.quote?.lastPrice)} />,
      },
      {
        accessorFn: (row) => toNumber(row.quote?.bidPrice) ?? 0,
        id: "bid",
        header: "Bid",
        cell: ({ row }) => <PriceCell value={toNumber(row.original.quote?.bidPrice)} />,
      },
      {
        accessorFn: (row) => toNumber(row.quote?.askPrice) ?? 0,
        id: "ask",
        header: "Ask",
        cell: ({ row }) => <PriceCell value={toNumber(row.original.quote?.askPrice)} />,
      },
      {
        id: "spread",
        header: "Spread",
        enableSorting: false,
        cell: ({ row }) => {
          const bid = toNumber(row.original.quote?.bidPrice);
          const ask = toNumber(row.original.quote?.askPrice);
          if (bid === null || ask === null) return <span className="text-muted-foreground">—</span>;
          return <PriceCell value={ask - bid} />;
        },
      },
      {
        accessorFn: (row) => row.instrument.status,
        id: "status",
        header: "Status",
        cell: ({ getValue }) => <StatusBadge status={getValue<Instrument["status"]>()} />,
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex justify-end gap-2">
            {activeWatchlistId && (
              <Button variant="ghost" size="sm" onClick={() => addToWatchlist(activeWatchlistId, row.original.instrument.id)}>
                Watch
              </Button>
            )}
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/market/${row.original.instrument.id}`}>
                <LineChartIcon className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                Chart
              </Link>
            </Button>
          </div>
        ),
      },
    ],
    [favorites, toggleFavorite, activeWatchlistId, addToWatchlist],
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No instruments match your filters.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder ? null : header.column.getCanSort() ? (
                    <button type="button" className="flex items-center gap-1 font-medium" onClick={header.column.getToggleSortingHandler()}>
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      <ArrowUpDown className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                    </button>
                  ) : (
                    flexRender(header.column.columnDef.header, header.getContext())
                  )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id}>
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
