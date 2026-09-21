"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useInstruments } from "@/features/market/hooks/use-market-data";

const DEFAULT_SYMBOLS = ["EURUSD", "XAUUSD", "NAS100"];

function normalizeSymbol(symbol: string): string {
  return symbol.trim().toUpperCase().replace("/", "");
}

export default function DashboardPage() {
  const router = useRouter();

  const instrumentsQuery = useInstruments({
    query: "EUR",
    status: "ACTIVE",
    page: 1,
    pageSize: 100,
  });

  useEffect(() => {
    const instruments = instrumentsQuery.data?.data ?? [];

    if (instruments.length === 0) {
      return;
    }

    const preferred =
      DEFAULT_SYMBOLS.map((wanted) =>
        instruments.find(
          (instrument) =>
            normalizeSymbol(instrument.symbol) === wanted,
        ),
      ).find(Boolean);

    if (preferred) {
      router.replace(`/trading?instrument=${preferred.id}`);
    }
  }, [instrumentsQuery.data, router]);

  if (instrumentsQuery.isError) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-sm text-destructive">
          Unable to load the chart workspace.
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <p className="text-sm text-muted-foreground">
        Loading chart workspace…
      </p>
    </div>
  );
}
