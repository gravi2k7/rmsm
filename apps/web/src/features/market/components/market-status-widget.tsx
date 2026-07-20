"use client";

import { Globe2 } from "lucide-react";
import { Badge, Skeleton } from "@rmsm/ui";
import { useMarketStatuses } from "../hooks/use-market-status";

export function MarketStatusWidget() {
  const { data, isLoading, isError } = useMarketStatuses();

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-full" />
      </div>
    );
  }

  if (isError) {
    return <p className="text-sm text-muted-foreground">Couldn&apos;t load market status.</p>;
  }

  const exchanges = data?.items ?? [];
  if (exchanges.length === 0) {
    return <p className="text-sm text-muted-foreground">No exchanges configured.</p>;
  }

  return (
    <ul className="space-y-2">
      {exchanges.map((exchange) => (
        <li key={exchange.id} className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Globe2 className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
            <span>{exchange.name}</span>
          </div>
          <Badge variant={exchange.isOpen ? "success" : "secondary"}>{exchange.isOpen ? "Open" : "Closed"}</Badge>
        </li>
      ))}
    </ul>
  );
}
