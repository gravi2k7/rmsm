"use client";

import { useMemo, useState } from "react";
import { Search, Star } from "lucide-react";
import { Input, Tabs, TabsList, TabsTrigger, Button, Alert, AlertDescription } from "@rmsm/ui";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useInstruments, useQuotes } from "@/features/market/hooks/use-market-data";
import { useEffect } from "react";
import { MarketDataRealtimeService } from "@/features/market/services/market-data-realtime.service";
import {
  MarketDataWebSocketClient,
  type MarketDataQuoteEvent,
} from "@/features/market/services/market-data-websocket.client";
import { MarketWatchTable } from "@/features/market/components/market-watch-table";
import { MobileMarketWatch } from "@/features/market/components/mobile-market-watch";
import { MarketStatusWidget } from "@/features/market/components/market-status-widget";
import { TradingSessionsWidget } from "@/features/market/components/trading-sessions-widget";
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
    page: favoritesOnly ? 1 : page,
    pageSize: favoritesOnly ? 500 : PAGE_SIZE,
  });

  const instruments = useMemo(() => {
    const all = instrumentsQuery.data?.data ?? [];
    return favoritesOnly ? all.filter((i) => favorites.includes(i.id)) : all;
  }, [instrumentsQuery.data, favoritesOnly, favorites]);

  const instrumentIds = useMemo(() => instruments.map((i) => i.id), [instruments]);

  const quotesQuery = useQuotes(instrumentIds);

  const [liveQuotes, setLiveQuotes] = useState<Map<string, MarketDataQuoteEvent>>(new Map());

  useEffect(() => {
    if (instrumentIds.length === 0) {
      setLiveQuotes(new Map());
      return;
    }

    let quoteListener: ((quote: MarketDataQuoteEvent) => void) | undefined;

    const client = new MarketDataWebSocketClient({
      onQuote: (quote) => {
        quoteListener?.(quote);
      },
    });

    const service = new MarketDataRealtimeService({
      client,
      onQuote: (listener) => {
        quoteListener = listener;

        return () => {
          if (quoteListener === listener) {
            quoteListener = undefined;
          }
        };
      },
    });

    const removeQuoteListener = service.addQuoteListener((quote) => {
      if (!instrumentIds.includes(quote.instrumentId)) {
        return;
      }

      setLiveQuotes((current) => {
        const next = new Map(current);
        next.set(quote.instrumentId, quote);
        return next;
      });
    });

    service.subscribe(instrumentIds);

    return () => {
      removeQuoteListener();
      service.unsubscribe(instrumentIds);
      service.destroy();
    };
  }, [instrumentIds]);

  const rows = useMemo(
    () =>
      instruments.map((instrument) => {
        const restQuote = quotesQuery.data?.find((q) => q.instrumentId === instrument.id);
        const liveQuote = liveQuotes.get(instrument.id);

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
    [instruments, quotesQuery.data, liveQuotes],
  );

  const pagination = instrumentsQuery.data?.pagination;

  return (
    <div className="space-y-4">
      <div className="hidden md:block">
        <h1 className="text-xl font-semibold">Market Watch</h1>
        <p className="text-muted-foreground text-sm">
          Live instrument prices from the Enterprise Market Data API.
        </p>
      </div>

      <section aria-label="Market context" className="hidden gap-4 md:grid lg:grid-cols-2">
        <div className="bg-card rounded-lg border p-4">
          <div className="mb-3">
            <h2 className="text-sm font-semibold">Market Status</h2>
            <p className="text-muted-foreground text-xs">Exchange open and closed status.</p>
          </div>

          <MarketStatusWidget />
        </div>

        <div className="bg-card rounded-lg border p-4">
          <div className="mb-3">
            <h2 className="text-sm font-semibold">Trading Sessions</h2>
            <p className="text-muted-foreground text-xs">Global trading-session activity in UTC.</p>
          </div>

          <TradingSessionsWidget />
        </div>
      </section>

      <div className="hidden flex-col gap-3 sm:flex-row sm:items-center sm:justify-between md:flex">
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
          <Button
            variant={favoritesOnly ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setFavoritesOnly((v) => !v);
              setPage(1);
            }}
          >
            <Star className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            Favorites
          </Button>
          <div className="relative">
            <Search
              className="text-muted-foreground pointer-events-none absolute left-2.5 top-2.5 h-4 w-4"
              aria-hidden="true"
            />
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

      <div className="hidden md:block">
        <MarketWatchTable rows={rows} isLoading={instrumentsQuery.isLoading} />
      </div>

      <div className="hidden md:block">
        {pagination && pagination.totalPages > 1 && !favoritesOnly && (
          <div className="text-muted-foreground flex items-center justify-between text-sm">
            <span>
              Page {pagination.page} of {pagination.totalPages} — {pagination.totalCount}{" "}
              instruments
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!pagination.hasPreviousPage}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!pagination.hasNextPage}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
