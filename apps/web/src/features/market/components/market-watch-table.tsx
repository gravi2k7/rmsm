"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

type PriceMovement = "UP" | "DOWN" | "UNCHANGED";

function getPriceMovement(
  current: number | null,
  previous: number | null,
): PriceMovement {
  if (current === null || previous === null || current === previous) {
    return "UNCHANGED";
  }

  return current > previous ? "UP" : "DOWN";
}

function movementClassName(
  movement: PriceMovement,
): string {
  if (movement === "UP") {
    return "text-green-500";
  }

  if (movement === "DOWN") {
    return "text-red-500";
  }

  return "text-foreground";
}

function StatusBadge({ status }: { status: Instrument["status"] }) {
  const variant = status === "ACTIVE" ? "default" : status === "SUSPENDED" ? "secondary" : "outline";
  return <Badge variant={variant}>{status}</Badge>;
}

function PriceCell({
  value,
  previousValue = null,
  precision = 5,
}: {
  value: number | null;
  previousValue?: number | null;
  precision?: number;
}) {
  if (value === null) {
    return <span className="text-muted-foreground">—</span>;
  }

  const movement = getPriceMovement(
    value,
    previousValue,
  );

  return (
    <span
      className={cn(
        "tabular-nums transition-colors duration-150",
        movementClassName(movement),
      )}
    >
      {value.toFixed(precision)}
    </span>
  );
}

export function MarketWatchTable({ rows, isLoading }: { rows: MarketWatchRow[]; isLoading: boolean }) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const previousPricesRef = useRef<
    Map<string, {
      last: number | null;
      bid: number | null;
      ask: number | null;
    }>
  >(new Map());

  const watchlists = useWatchlistStore((s) => s.watchlists);
  const favorites = useWatchlistStore((s) => s.favoriteInstrumentIds);
  const toggleFavorite = useWatchlistStore((s) => s.toggleFavorite);
  const activeWatchlistId = useWatchlistStore((s) => s.activeWatchlistId);
  const addToWatchlist = useWatchlistStore((s) => s.addToWatchlist);

  const effectiveWatchlistId =
    watchlists.find((w) => w.id === activeWatchlistId)?.id ??
    watchlists[0]?.id ??
    null;

  useEffect(() => {
    /*
     * Capture the last rendered quote only after the current render.
     *
     * Using a ref is intentional: updating the previous-price snapshot
     * must not trigger another render. The next incoming quote can then
     * compare against this snapshot and remain green/red until the next
     * market update.
     */
    for (const row of rows) {
      const instrumentId = row.instrument.id;

      previousPricesRef.current.set(instrumentId, {
        last: toNumber(row.quote?.lastPrice),
        bid: toNumber(row.quote?.bidPrice),
        ask: toNumber(row.quote?.askPrice),
      });
    }
  }, [rows]);

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
              <Star
                className={cn(
                  "h-4 w-4",
                  isFavorite
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-muted-foreground",
                )}
                aria-hidden="true"
              />
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
        cell: ({ row }) => {
          const instrumentId = row.original.instrument.id;
          const previous =
            previousPricesRef.current.get(instrumentId)?.last ?? null;

          return (
            <PriceCell
              value={toNumber(row.original.quote?.lastPrice)}
              previousValue={previous}
            />
          );
        },
      },
      {
        accessorFn: (row) => toNumber(row.quote?.bidPrice) ?? 0,
        id: "bid",
        header: "Bid",
        cell: ({ row }) => {
          const instrumentId = row.original.instrument.id;
          const previous =
            previousPricesRef.current.get(instrumentId)?.bid ?? null;

          return (
            <PriceCell
              value={toNumber(row.original.quote?.bidPrice)}
              previousValue={previous}
            />
          );
        },
      },
      {
        accessorFn: (row) => toNumber(row.quote?.askPrice) ?? 0,
        id: "ask",
        header: "Ask",
        cell: ({ row }) => {
          const instrumentId = row.original.instrument.id;
          const previous =
            previousPricesRef.current.get(instrumentId)?.ask ?? null;

          return (
            <PriceCell
              value={toNumber(row.original.quote?.askPrice)}
              previousValue={previous}
            />
          );
        },
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
        cell: ({ row }) => {
          const instrumentId = row.original.instrument.id;

          const activeWatchlist = effectiveWatchlistId
            ? watchlists.find((w) => w.id === effectiveWatchlistId)
            : undefined;

          const isWatched =
            activeWatchlist?.instrumentIds.includes(instrumentId) ?? false;

          return (
            <div className="flex justify-end gap-2">
              {effectiveWatchlistId && (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={isWatched}
                  onClick={() => {
                    if (!isWatched) {
                      addToWatchlist(
                        effectiveWatchlistId,
                        instrumentId,
                      );
                    }
                  }}
                >
                  {isWatched ? "Added" : "Watch"}
                </Button>
              )}

              <Button variant="ghost" size="sm" asChild>
                <Link href={`/market/${instrumentId}`}>
                  <LineChartIcon className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                  Chart
                </Link>
              </Button>
            </div>
          );
        },
      },
    ],
    [
      watchlists,
      favorites,
      toggleFavorite,
      effectiveWatchlistId,
      addToWatchlist,
    ],
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
