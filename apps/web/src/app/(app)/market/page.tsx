"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Search,
  Star,
  Plus,
  GripVertical,
  RotateCcw,
  MoreVertical,
} from "lucide-react";
import {
  Input,
  Tabs,
  TabsList,
  TabsTrigger,
  Button,
  Alert,
  AlertDescription,
  Badge,
} from "@rmsm/ui";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import {
  useCandles,
  useInstruments,
  useInstrumentsBatch,
  useQuotes,
} from "@/features/market/hooks/use-market-data";
import { MarketWatchTable } from "@/features/market/components/market-watch-table";
import { RMSMCandlestickChart } from "@/features/market/components/rmsm-candlestick-chart";
import { useMarketRealtime } from "@/features/market/hooks/use-market-realtime";
import type { CandleInterval } from "@/features/market/types";
import { priceFormatFromTickSize } from "@/features/market/types";
import { MobileMarketWatch } from "@/features/market/components/mobile-market-watch";
import { useWatchlistStore } from "@/features/watchlists/store";
import type { AssetClass } from "@/features/market/types";

const PAGE_SIZE = 14;

type PageItem = number | "ellipsis";

function getPageItems(totalPages: number, currentPage: number): PageItem[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, "ellipsis", totalPages];
  }

  if (currentPage >= totalPages - 3) {
    return [
      1,
      "ellipsis",
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ];
  }

  return [
    1,
    "ellipsis",
    currentPage - 1,
    currentPage,
    currentPage + 1,
    "ellipsis",
    totalPages,
  ];
}

const MAJOR_PAIR_SYMBOLS = new Set([
  "EURUSD",
  "GBPUSD",
  "USDJPY",
  "USDCHF",
  "AUDUSD",
  "USDCAD",
  "NZDUSD",
]);

const STATUS_OPTIONS = [
  { label: "All Status", value: "ALL" },
  { label: "Active", value: "ACTIVE" },
  { label: "Suspended", value: "SUSPENDED" },
  { label: "Inactive", value: "INACTIVE" },
] as const;

export default function MarketWatchPage() {
  const [category, setCategory] = useState<AssetClass | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [majorPairsOnly, setMajorPairsOnly] = useState(false);
  const [statusFilter, setStatusFilter] =
    useState<(typeof STATUS_OPTIONS)[number]["value"]>("ALL");
  const [selectedInstrumentId, setSelectedInstrumentId] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const debouncedSearch = useDebouncedValue(search, 300);

  const favorites = useWatchlistStore((s) => s.favoriteInstrumentIds);
  const watchlists = useWatchlistStore((s) => s.watchlists);
  const activeWatchlistId = useWatchlistStore((s) => s.activeWatchlistId);
  const addToWatchlist = useWatchlistStore((s) => s.addToWatchlist);
  const setActiveWatchlist = useWatchlistStore((s) => s.setActiveWatchlist);
  const removeFromWatchlist = useWatchlistStore((s) => s.removeFromWatchlist);
  const reorderWatchlist = useWatchlistStore((s) => s.reorderWatchlist);

  const activeWatchlist =
    watchlists.find((w) => w.id === activeWatchlistId);

  const activeWatchlistIds = activeWatchlist?.instrumentIds ?? [];

  /*
   * There are three distinct catalogue modes:
   *
   * 1. ALL MARKETS  -> server-side paginated catalogue
   * 2. FAVORITES    -> exact persisted favorite IDs
   * 3. WATCHLIST    -> exact persisted watchlist IDs
   *
   * Do not infer mode from whether IDs happen to exist. An empty
   * Favorites/Watchlist collection is still an exact-mode empty state.
   */
  const exactMode = favoritesOnly || !!activeWatchlistId;

  const exactInstrumentIds = useMemo(() => {
    if (favoritesOnly) {
      return [...new Set(favorites)];
    }

    if (activeWatchlistId) {
      return [...new Set(activeWatchlistIds)];
    }

    return [];
  }, [
    favoritesOnly,
    favorites,
    activeWatchlistId,
    activeWatchlistIds,
  ]);

  const exactInstrumentsQuery = useInstrumentsBatch(exactInstrumentIds);

  const instrumentsQuery = useInstruments({
    query: debouncedSearch || undefined,
    assetClass: category === "ALL" ? undefined : category,
    page,
    pageSize: PAGE_SIZE,
    enabled: !exactMode,
  });

  const instruments = useMemo(() => {
    /*
     * Watchlist/favorites mode must be driven by the exact persisted
     * instrument IDs. Do not filter the first page of the global
     * catalogue because a watchlist item may live on another page.
     */
    if (exactMode) {
      const exact = exactInstrumentsQuery.data ?? [];

      const order = new Map(
        exactInstrumentIds.map((id, index) => [id, index]),
      );

      const normalizedSearch = debouncedSearch.trim().toLowerCase();

      return exact
        .filter((instrument) => {
          if (category !== "ALL" && instrument.assetClass !== category) {
            return false;
          }

          if (!normalizedSearch) {
            return true;
          }

          return (
            instrument.symbol.toLowerCase().includes(normalizedSearch) ||
            instrument.name.toLowerCase().includes(normalizedSearch) ||
            instrument.assetClass.toLowerCase().includes(normalizedSearch)
          );
        })
        .sort(
          (a, b) =>
            (order.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
            (order.get(b.id) ?? Number.MAX_SAFE_INTEGER),
        );
    }

    return instrumentsQuery.data?.data ?? [];
  }, [
    exactMode,
    exactInstrumentIds,
    exactInstrumentsQuery.data,
    instrumentsQuery.data,
    category,
    debouncedSearch,
  ]);

  const filteredInstruments = useMemo(() => {
    return instruments.filter((instrument) => {
      if (
        majorPairsOnly &&
        (
          instrument.assetClass !== "FOREX" ||
          !MAJOR_PAIR_SYMBOLS.has(instrument.symbol.toUpperCase())
        )
      ) {
        return false;
      }

      if (
        statusFilter !== "ALL" &&
        String(instrument.status) !== statusFilter
      ) {
        return false;
      }

      return true;
    });
  }, [instruments, majorPairsOnly, statusFilter]);

  const instrumentIds = useMemo(
    () => filteredInstruments.map((i) => i.id),
    [filteredInstruments],
  );

  const quotesQuery = useQuotes(instrumentIds);

  const {
    liveQuote: selectedLiveQuote,
    liveCandle: selectedLiveCandle,
    liveQuotes,
  } = useMarketRealtime(
    selectedInstrumentId ?? undefined,
    "ONE_HOUR",
    instrumentIds,
  );

  const rows = useMemo(
    () =>
      filteredInstruments.map((instrument) => {
        const restQuote = quotesQuery.data?.find((q) => q.instrumentId === instrument.id);
        const liveQuote = liveQuotes[instrument.id];

        return {
          instrument,
          quote: liveQuote
            ? {
                id: restQuote?.id ?? `${instrument.id}:${liveQuote.eventTime}`,
                instrumentId: instrument.id,
                bidPrice: liveQuote.bidPrice ?? restQuote?.bidPrice ?? null,
                askPrice: liveQuote.askPrice ?? restQuote?.askPrice ?? null,
                lastPrice: liveQuote.lastPrice ?? restQuote?.lastPrice ?? null,
                bidSize: liveQuote.bidSize ?? restQuote?.bidSize ?? null,
                askSize: liveQuote.askSize ?? restQuote?.askSize ?? null,
                eventTime: liveQuote.eventTime,
                providerId: restQuote?.providerId ?? "",
                source: restQuote?.source ?? "LIVE",
              }
            : restQuote,
        };
      }),
    [filteredInstruments, quotesQuery.data, liveQuotes],
  );

  const pagination =
    exactMode || majorPairsOnly || statusFilter !== "ALL"
      ? undefined
      : instrumentsQuery.data?.pagination;

  const selectedRow =
    rows.find((row) => row.instrument.id === selectedInstrumentId) ??
    rows[0];

  /*
   * Keep the selection aligned with the visible result set.
   * The effect below intentionally runs only when the visible
   * row set changes.
   */

  const selectedQuote = selectedRow?.quote;

  useEffect(() => {
    if (rows.length === 0) {
      if (selectedInstrumentId !== null) {
        setSelectedInstrumentId(null);
      }
      return;
    }

    if (
      !selectedInstrumentId ||
      !rows.some((row) => row.instrument.id === selectedInstrumentId)
    ) {
      const firstRow = rows[0];
      if (firstRow) {
        setSelectedInstrumentId(firstRow.instrument.id);
      }
    }
  }, [rows, selectedInstrumentId]);

  const selectedChartInterval: CandleInterval = "ONE_HOUR";

  const selectedChartParams = useMemo(() => {
    if (!selectedRow) return null;

    const to = new Date();
    const from = new Date(
      to.getTime() - 7 * 24 * 60 * 60 * 1000,
    );

    return {
      instrumentId: selectedRow.instrument.id,
      interval: selectedChartInterval,
      from: from.toISOString(),
      to: to.toISOString(),
      limit: 500,
    };
  }, [selectedRow?.instrument.id]);

  const selectedCandlesQuery = useCandles(selectedChartParams);

  const selectedChartCandles = selectedCandlesQuery.data ?? [];

  const selectedLast =
    selectedQuote?.lastPrice ??
    selectedQuote?.bidPrice ??
    selectedQuote?.askPrice;

  const selectedBid = selectedQuote?.bidPrice;
  const selectedAsk = selectedQuote?.askPrice;

  const selectedWatchlisted =
    !!selectedRow &&
    !!activeWatchlist &&
    activeWatchlist.instrumentIds.includes(selectedRow.instrument.id);

  function resetMarketFilters() {
    setActiveWatchlist("");
    setCategory("ALL");
    setSearch("");
    setStatusFilter("ALL");
    setMajorPairsOnly(false);
    setFavoritesOnly(false);
    setPage(1);
  }

  function handleDrop(targetIndex: number) {
    if (
      dragIndex === null ||
      !activeWatchlist ||
      dragIndex === targetIndex
    ) {
      return;
    }

    const next = [...activeWatchlist.instrumentIds];
    const [moved] = next.splice(dragIndex, 1);

    if (!moved) return;

    next.splice(targetIndex, 0, moved);
    reorderWatchlist(activeWatchlist.id, next);
    setDragIndex(null);
  }

  return (
    <div className="space-y-2">
      <div className="hidden md:block space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">Markets</h1>
            <p className="text-muted-foreground text-sm">
              Real-time prices across global markets. Add to your watchlist and trade instantly.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={!selectedRow || !activeWatchlist}
              onClick={() => {
                if (!selectedRow || !activeWatchlist) return;

                if (!activeWatchlist.instrumentIds.includes(selectedRow.instrument.id)) {
                  addToWatchlist(
                    activeWatchlist.id,
                    selectedRow.instrument.id,
                  );
                }
              }}
            >
              <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
              Add to Watchlist
            </Button>

            <Button
              variant="ghost"
              size="icon"
              aria-label="Market actions"
            >
              <MoreVertical className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>

        <Tabs
          value={
            favoritesOnly
              ? "__favorites__"
              : majorPairsOnly
                ? "__major_pairs__"
                : category
          }
          onValueChange={(value) => {
            setPage(1);

            if (value === "__favorites__") {
              setActiveWatchlist("");
              setFavoritesOnly(true);
              setMajorPairsOnly(false);
              return;
            }

            if (value === "__major_pairs__") {
              setActiveWatchlist("");
              setFavoritesOnly(false);
              setMajorPairsOnly(true);
              setCategory("FOREX");
              return;
            }

            setActiveWatchlist("");
            setFavoritesOnly(false);
            setMajorPairsOnly(false);
            setCategory(value as AssetClass | "ALL");
          }}
        >
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="ALL">
              All Markets
            </TabsTrigger>

            <TabsTrigger value="__favorites__">
              <Star
                className="mr-1.5 h-3.5 w-3.5"
                aria-hidden="true"
              />
              Favorites
            </TabsTrigger>

            <TabsTrigger value="__major_pairs__">
              Major Pairs
            </TabsTrigger>

            <TabsTrigger value="FOREX">
              Forex
            </TabsTrigger>

            <TabsTrigger value="INDEX">
              Indices
            </TabsTrigger>

            <TabsTrigger value="COMMODITY">
              Commodities
            </TabsTrigger>

            <TabsTrigger value="CRYPTO">
              Crypto
            </TabsTrigger>

            <TabsTrigger value="EQUITY">
              Stocks
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search
              className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
              aria-hidden="true"
            />
            <Input
              placeholder="Search symbols, name or asset class..."
              className="pl-9"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              aria-label="Search symbols, name or asset class"
            />
          </div>

          <select
            value={category}
            onChange={(event) => {
              setActiveWatchlist("");
              setCategory(
                event.target.value as AssetClass | "ALL",
              );
              setFavoritesOnly(false);
              setMajorPairsOnly(false);
              setPage(1);
            }}
            aria-label="Asset class"
            className="h-9 rounded-md border bg-background px-3 text-sm"
          >
            <option value="ALL">All Asset Classes</option>
            <option value="FOREX">Forex</option>
            <option value="INDEX">Indices</option>
            <option value="COMMODITY">Commodities</option>
            <option value="CRYPTO">Crypto</option>
            <option value="EQUITY">Stocks</option>
          </select>

          <select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(
                event.target.value as (typeof STATUS_OPTIONS)[number]["value"],
              );
              setPage(1);
            }}
            aria-label="Market status"
            className="h-9 rounded-md border bg-background px-3 text-sm"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <Button
            variant="ghost"
            size="sm"
            onClick={resetMarketFilters}
            className="shrink-0"
          >
            <RotateCcw
              className="mr-1.5 h-4 w-4"
              aria-hidden="true"
            />
            Reset
          </Button>
        </div>
      </div>

      <div className="hidden md:block">
        {instrumentsQuery.isError && (
          <Alert variant="destructive">
            <AlertDescription>Couldn&apos;t load instruments. Please try again.</AlertDescription>
          </Alert>
        )}
      </div>

      <div className="block md:hidden">
        <MobileMarketWatch
          rows={rows}
          isLoading={instrumentsQuery.isLoading}
          category={category}
          onCategoryChange={(value) => {
            setCategory(value);
            setFavoritesOnly(false);
            setPage(1);
          }}
          search={search}
          onSearchChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          favoritesOnly={favoritesOnly}
          onFavoritesOnlyChange={(value) => {
            setFavoritesOnly(value);
            if (value) {
              setCategory("ALL");
            }
            setPage(1);
          }}
        />
      </div>

      <div className="hidden min-h-0 gap-4 md:flex">
        <div className="min-w-0 flex-1">
          <MarketWatchTable
            rows={rows}
            isLoading={
              exactMode
                ? exactInstrumentsQuery.isLoading
                : instrumentsQuery.isLoading
            }
            onSelectInstrument={setSelectedInstrumentId}
            selectedInstrumentId={selectedInstrumentId}
          />
        </div>

        <aside className="w-[340px] shrink-0 rounded-lg border bg-card p-4">
          {selectedRow ? (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-semibold">
                    {selectedRow.instrument.symbol}
                  </div>
                  <div className="text-muted-foreground text-sm">
                    {selectedRow.instrument.name}
                  </div>
                </div>

                <button
                  type="button"
                  className="rounded-md p-1.5"
                  onClick={() =>
                    useWatchlistStore
                      .getState()
                      .toggleFavorite(selectedRow.instrument.id)
                  }
                  aria-label={
                    favorites.includes(selectedRow.instrument.id)
                      ? "Remove from favorites"
                      : "Add to favorites"
                  }
                >
                  <Star
                    className={
                      favorites.includes(selectedRow.instrument.id)
                        ? "h-5 w-5 fill-yellow-400 text-yellow-400"
                        : "text-muted-foreground h-5 w-5"
                    }
                    aria-hidden="true"
                  />
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5">
                <Badge variant="outline">
                  {selectedRow.instrument.assetClass}
                </Badge>

                <Badge variant="outline">
                  {selectedRow.instrument.currency}
                </Badge>

                <Badge
                  variant={
                    selectedRow.instrument.status === "ACTIVE"
                      ? "default"
                      : "secondary"
                  }
                >
                  {selectedRow.instrument.status}
                </Badge>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Last", value: selectedLast, className: "" },
                  {
                    label: "Bid",
                    value: selectedBid,
                    className: "text-success",
                  },
                  {
                    label: "Ask",
                    value: selectedAsk,
                    className: "text-destructive",
                  },
                ].map(({ label, value, className }) => {
                  const { precision } = priceFormatFromTickSize(
                    selectedRow.instrument.tickSize,
                  );

                  return (
                    <div
                      key={label}
                      className="rounded-md border bg-muted/20 p-2.5"
                    >
                      <div className="text-muted-foreground text-[11px]">
                        {label}
                      </div>
                      <div
                        className={`mt-1 font-semibold tabular-nums ${className}`}
                      >
                        {value
                          ? Number(value).toFixed(precision)
                          : "—"}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="overflow-hidden rounded-md border bg-background">
                <div className="flex items-center justify-between border-b px-3 py-2">
                  <div>
                    <div className="text-xs font-medium">Price Chart</div>
                    <div className="text-muted-foreground text-[11px]">
                      1H · 7 days
                    </div>
                  </div>
                  {selectedLiveQuote && (
                    <Badge variant="outline" className="text-[10px]">
                      LIVE
                    </Badge>
                  )}
                </div>

                <div className="h-[260px]">
                  {selectedCandlesQuery.isLoading ? (
                    <div className="text-muted-foreground flex h-full items-center justify-center text-xs">
                      Loading chart…
                    </div>
                  ) : selectedChartCandles.length > 0 ? (
                    <RMSMCandlestickChart
                      candles={selectedChartCandles}
                      liveQuote={selectedLiveQuote}
                      liveCandle={selectedLiveCandle}
                      interval={selectedChartInterval}
                      height={260}
                      hideInternalDrawingTools
                    />
                  ) : (
                    <div className="text-muted-foreground flex h-full items-center justify-center text-xs">
                      No candle data available.
                    </div>
                  )}
                </div>
              </div>

              <Button asChild className="w-full">
                <Link
                  href={`/trading?instrument=${selectedRow.instrument.id}`}
                >
                  Trade {selectedRow.instrument.symbol}
                </Link>
              </Button>

              {activeWatchlist && (
                <Button
                  variant={selectedWatchlisted ? "secondary" : "outline"}
                  className="w-full"
                  disabled={selectedWatchlisted}
                  onClick={() => {
                    if (!selectedWatchlisted) {
                      addToWatchlist(
                        activeWatchlist.id,
                        selectedRow.instrument.id,
                      );
                    }
                  }}
                >
                  <Star className="mr-1.5 h-4 w-4" aria-hidden="true" />
                  {selectedWatchlisted
                    ? `In ${activeWatchlist.name}`
                    : "Add to Watchlist"}
                </Button>
              )}

              {activeWatchlist && !favoritesOnly && (
                <div className="space-y-2 border-t pt-3">
                  <div className="text-muted-foreground text-xs">
                    Watchlist order
                  </div>

                  {activeWatchlist.instrumentIds.length > 0 && (
                    <div className="max-h-32 space-y-1 overflow-y-auto">
                      {activeWatchlist.instrumentIds.map(
                        (instrumentId, index) => (
                          <div
                            key={instrumentId}
                            draggable
                            onDragStart={() => setDragIndex(index)}
                            onDragOver={(e) =>
                              e.preventDefault()
                            }
                            onDrop={() => handleDrop(index)}
                            className="flex items-center gap-2 rounded px-2 py-1 text-xs"
                          >
                            <GripVertical
                              className="text-muted-foreground h-3.5 w-3.5"
                              aria-hidden="true"
                            />

                            <span className="truncate">
                              {rows.find(
                                (row) =>
                                  row.instrument.id === instrumentId,
                              )?.instrument.symbol ?? instrumentId}
                            </span>

                            <button
                              type="button"
                              className="ml-auto text-muted-foreground hover:text-foreground"
                              onClick={() =>
                                removeFromWatchlist(
                                  activeWatchlist.id,
                                  instrumentId,
                                )
                              }
                              aria-label={`Remove ${instrumentId}`}
                            >
                              ×
                            </button>
                          </div>
                        ),
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="text-muted-foreground flex h-full min-h-64 items-center justify-center text-sm">
              Select an instrument to view details.
            </div>
          )}
        </aside>
      </div>

      <div className="hidden md:block">
        {pagination && pagination.totalPages > 1 && !favoritesOnly && (
          <div className="flex items-center justify-between gap-4 border-t px-1 pt-3 text-sm">
            <span className="text-muted-foreground whitespace-nowrap">
              Showing{" "}
              {Math.min(
                (pagination.page - 1) * pagination.pageSize + 1,
                pagination.totalCount,
              )}
              –
              {Math.min(
                pagination.page * pagination.pageSize,
                pagination.totalCount,
              )}{" "}
              of {pagination.totalCount} instruments
            </span>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                disabled={!pagination.hasPreviousPage}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                aria-label="Previous page"
              >
                ‹
              </Button>

              {getPageItems(
                pagination.totalPages,
                pagination.page,
              ).map((item, index) =>
                item === "ellipsis" ? (
                  <span
                    key={`ellipsis-${index}`}
                    className="text-muted-foreground flex h-8 w-8 items-center justify-center"
                    aria-hidden="true"
                  >
                    …
                  </span>
                ) : (
                  <Button
                    key={item}
                    variant={
                      item === pagination.page ? "default" : "outline"
                    }
                    size="sm"
                    className="h-8 min-w-8 px-2"
                    onClick={() => setPage(item)}
                    aria-label={`Page ${item}`}
                    aria-current={
                      item === pagination.page ? "page" : undefined
                    }
                  >
                    {item}
                  </Button>
                ),
              )}

              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                disabled={!pagination.hasNextPage}
                onClick={() =>
                  setPage((p) =>
                    Math.min(pagination.totalPages, p + 1),
                  )
                }
                aria-label="Next page"
              >
                ›
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
