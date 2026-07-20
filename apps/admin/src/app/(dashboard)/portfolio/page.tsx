"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Card, CardContent, CardHeader, CardTitle, Tabs, TabsList, TabsTrigger, TabsContent, Badge } from "@rmsm/ui";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { StatCard } from "@/components/shared/stat-card";
import { LoadingState, ErrorState } from "@/components/shared/data-states";
import { Wallet, TrendingUp, Target, DollarSign } from "lucide-react";
import { usePortfolio, usePositions, useTrades } from "@/features/portfolio/hooks/use-portfolio";
import { computePerformanceMetrics, computeCumulativePnl } from "@/features/portfolio/lib/performance";
import { PnlChart } from "@/features/portfolio/components/pnl-chart";
import type { Position, Trade } from "@/features/portfolio/types";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

const positionColumns: ColumnDef<Position, unknown>[] = [
  { accessorKey: "symbolCode", header: "Symbol" },
  { accessorKey: "side", header: "Side", cell: ({ row }) => <Badge variant={row.original.side === "LONG" ? "success" : "destructive"}>{row.original.side}</Badge> },
  { accessorKey: "quantityUnits", header: "Quantity", cell: ({ row }) => row.original.quantityUnits.toLocaleString() },
  { accessorKey: "averageEntryPrice", header: "Entry Price", cell: ({ row }) => row.original.averageEntryPrice.toFixed(5) },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <Badge variant={row.original.status === "OPEN" ? "success" : "secondary"}>{row.original.status}</Badge>,
  },
  {
    accessorKey: "realizedPnl",
    header: "Realized P&L",
    cell: ({ row }) => (row.original.realizedPnl !== undefined ? formatCurrency(row.original.realizedPnl) : "—"),
  },
];

const tradeColumns: ColumnDef<Trade, unknown>[] = [
  { accessorKey: "symbolCode", header: "Symbol" },
  { accessorKey: "side", header: "Side" },
  { accessorKey: "quantityUnits", header: "Quantity", cell: ({ row }) => row.original.quantityUnits.toLocaleString() },
  { accessorKey: "entryPrice", header: "Entry", cell: ({ row }) => row.original.entryPrice.toFixed(5) },
  { accessorKey: "exitPrice", header: "Exit", cell: ({ row }) => row.original.exitPrice.toFixed(5) },
  {
    accessorKey: "realizedPnl",
    header: "P&L",
    cell: ({ row }) => <span className={row.original.isWin ? "text-success" : "text-destructive"}>{formatCurrency(row.original.realizedPnl)}</span>,
  },
  { accessorKey: "closedAt", header: "Closed", cell: ({ row }) => new Date(row.original.closedAt).toLocaleString() },
];

export default function PortfolioPage() {
  const portfolio = usePortfolio();
  const positions = usePositions();
  const trades = useTrades();

  const metrics = useMemo(() => computePerformanceMetrics(trades.data?.items ?? []), [trades.data]);
  const pnlSeries = useMemo(() => computeCumulativePnl(trades.data?.items ?? []), [trades.data]);

  if (portfolio.isLoading) return <LoadingState />;
  if (portfolio.error || !portfolio.data) return <ErrorState error={portfolio.error} onRetry={() => portfolio.refetch()} />;

  const p = portfolio.data;

  return (
    <div>
      <PageHeader title="Portfolio" description="Cash, positions, trades, and trading performance." />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Cash Balance" value={formatCurrency(p.cashBalance)} icon={DollarSign} />
        <StatCard label="Buying Power" value={formatCurrency(p.buyingPower)} icon={Wallet} />
        <StatCard label="Margin Used" value={formatCurrency(p.marginUsed)} icon={Target} />
        <StatCard label="Margin Available" value={formatCurrency(p.marginAvailable)} icon={TrendingUp} />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Performance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Trades</span>
              <span>{metrics.totalTrades}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Win Rate</span>
              <span>{metrics.winRate.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Profit Factor</span>
              <span>{metrics.profitFactor === Infinity ? "∞" : metrics.profitFactor.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Realized P&amp;L</span>
              <span className={metrics.realizedPnl >= 0 ? "text-success" : "text-destructive"}>{formatCurrency(metrics.realizedPnl)}</span>
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          <PnlChart data={pnlSeries} />
        </div>
      </div>

      <Tabs defaultValue="positions">
        <TabsList>
          <TabsTrigger value="positions">Positions</TabsTrigger>
          <TabsTrigger value="trades">Trades</TabsTrigger>
        </TabsList>
        <TabsContent value="positions" className="mt-4">
          <DataTable
            columns={positionColumns}
            data={positions.data?.items}
            isLoading={positions.isLoading}
            error={positions.error}
            onRetry={() => positions.refetch()}
            emptyTitle="No positions yet"
          />
        </TabsContent>
        <TabsContent value="trades" className="mt-4">
          <DataTable columns={tradeColumns} data={trades.data?.items} isLoading={trades.isLoading} error={trades.error} onRetry={() => trades.refetch()} emptyTitle="No closed trades yet" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
