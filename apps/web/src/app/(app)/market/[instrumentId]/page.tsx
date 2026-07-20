"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Star } from "lucide-react";
import Link from "next/link";
import { Button, Badge, Skeleton, Alert, AlertDescription, Card, CardContent } from "@rmsm/ui";
import { cn } from "@rmsm/ui";
import { useInstrument, useQuotes } from "@/features/market/hooks/use-market-data";
import { TradingViewChart, toTradingViewSymbol } from "@/features/market/components/tradingview-chart";
import { toNumber } from "@/features/market/types";
import { useWatchlistStore } from "@/features/watchlists/store";

export default function InstrumentChartPage() {
  const params = useParams<{ instrumentId: string }>();
  const instrumentId = params.instrumentId;

  const instrumentQuery = useInstrument(instrumentId);
  const quotesQuery = useQuotes(instrumentId ? [instrumentId] : []);
  const quote = quotesQuery.data?.[0];

  const favorites = useWatchlistStore((s) => s.favoriteInstrumentIds);
  const toggleFavorite = useWatchlistStore((s) => s.toggleFavorite);
  const recordRecentlyViewed = useWatchlistStore((s) => s.recordRecentlyViewed);
  const isFavorite = favorites.includes(instrumentId);

  useEffect(() => {
    if (instrumentId) recordRecentlyViewed(instrumentId);
  }, [instrumentId, recordRecentlyViewed]);

  if (instrumentQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[520px] w-full" />
      </div>
    );
  }

  if (instrumentQuery.isError || !instrumentQuery.data) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Couldn&apos;t load this instrument. It may not exist, or you may not have access.</AlertDescription>
      </Alert>
    );
  }

  const instrument = instrumentQuery.data;
  const tvSymbol = toTradingViewSymbol(instrument);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/market" aria-label="Back to Market Watch">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold">{instrument.symbol}</h1>
              <Badge variant="outline">{instrument.assetClass}</Badge>
              <button
                type="button"
                onClick={() => toggleFavorite(instrument.id)}
                aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
                aria-pressed={isFavorite}
              >
                <Star className={cn("h-4 w-4 text-muted-foreground", isFavorite && "fill-warning text-warning")} aria-hidden="true" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground">{instrument.name}</p>
          </div>
        </div>

        <div className="flex gap-6 text-right text-sm">
          <div>
            <div className="text-xs text-muted-foreground">Last</div>
            <div className="tabular-nums font-medium">{toNumber(quote?.lastPrice)?.toFixed(5) ?? "—"}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Bid</div>
            <div className="tabular-nums font-medium">{toNumber(quote?.bidPrice)?.toFixed(5) ?? "—"}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Ask</div>
            <div className="tabular-nums font-medium">{toNumber(quote?.askPrice)?.toFixed(5) ?? "—"}</div>
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="p-2">
          <TradingViewChart symbol={tvSymbol} height={560} />
        </CardContent>
      </Card>
    </div>
  );
}
