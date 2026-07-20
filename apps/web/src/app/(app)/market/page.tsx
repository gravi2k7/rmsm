"use client";

import { useMemo, useState } from "react";
import { Search, Star } from "lucide-react";
import { Input, Tabs, TabsList, TabsTrigger, Button, Alert, AlertDescription } from "@rmsm/ui";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useInstruments, useQuotes } from "@/features/market/hooks/use-market-data";
import { MarketWatchTable } from "@/features/market/components/market-watch-table";
import { useWatchlistStore } from "@/features/watchlists/store";
import type { AssetClass } from "@/features/market/types";

const CATEGORIES: { label: string; value: AssetClass | "ALL" }[] = [
  { label: "All", value: "ALL" },
  { label: "Forex", value: "FOREX" },
  { label: "Indices", value: "INDEX" },
  { label: "Commodities", value: "COMMODITY" },
  { label: "Crypto", value: "CRYPTO" },
  { label: "Stocks", value: "EQUITY" },
];

const PAGE_SIZE = 25;

export default function MarketWatchPage() {
  const [category, setCategory] = useState<AssetClass | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const debouncedSearch = useDebouncedValue(search, 300);
  const favorites = useWatchlistStore((s) => s.favoriteInstrumentIds);

  const instrumentsQuery = useInstruments({
    query: debouncedSearch || undefined,
    assetClass: category === "ALL" ? undefined : category,
    page,
    pageSize: PAGE_SIZE,
  });

  const instruments = useMemo(() => {
    const all = instrumentsQuery.data?.data ?? [];
    return favoritesOnly ? all.filter((i) => favorites.includes(i.id)) : all;
  }, [instrumentsQuery.data, favoritesOnly, favorites]);

  const instrumentIds = useMemo(() => instruments.map((i) => i.id), [instruments]);
  const quotesQuery = useQuotes(instrumentIds);

  const rows = useMemo(
    () => instruments.map((instrument) => ({ instrument, quote: quotesQuery.data?.find((q) => q.instrumentId === instrument.id) })),
    [instruments, quotesQuery.data],
  );

  const pagination = instrumentsQuery.data?.pagination;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Market Watch</h1>
        <p className="text-sm text-muted-foreground">Live instrument prices from the Enterprise Market Data API.</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          value={category}
          onValueChange={(v) => {
            setCategory(v as AssetClass | "ALL");
            setPage(1);
          }}
        >
          <TabsList>
            {CATEGORIES.map((c) => (
              <TabsTrigger key={c.value} value={c.value}>
                {c.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2">
          <Button variant={favoritesOnly ? "default" : "outline"} size="sm" onClick={() => setFavoritesOnly((v) => !v)}>
            <Star className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            Favorites
          </Button>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <Input
              placeholder="Search symbol or name…"
              className="w-64 pl-8"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              aria-label="Search instruments"
            />
          </div>
        </div>
      </div>

      {instrumentsQuery.isError && (
        <Alert variant="destructive">
          <AlertDescription>Couldn&apos;t load instruments. Please try again.</AlertDescription>
        </Alert>
      )}

      <MarketWatchTable rows={rows} isLoading={instrumentsQuery.isLoading} />

      {pagination && pagination.totalPages > 1 && !favoritesOnly && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Page {pagination.page} of {pagination.totalPages} — {pagination.totalCount} instruments
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={!pagination.hasPreviousPage} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled={!pagination.hasNextPage} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
