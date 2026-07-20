"use client";

import { useMemo, useState } from "react";
import { Search, Wallet, TrendingUp, TrendingDown, PieChart as PieChartIcon } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";
import {
  Input,
  Tabs,
  TabsList,
  TabsTrigger,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Badge,
  Skeleton,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Alert,
  AlertDescription,
} from "@rmsm/ui";
import { EmptyState } from "@/components/ui-extra/empty-state";
import { TablePagination } from "@/components/ui-extra/table-pagination";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { usePortfolio, usePositions, useTrades } from "@/features/portfolio/hooks/use-portfolio";
import {
  computePerformanceMetrics,
  computeTodaysRealizedPnl,
  computeWeeklyRealizedPnl,
  computeMonthlyRealizedPnl,
} from "@/features/portfolio/lib/performance";
import { StatCard } from "@/features/dashboard/components/widget-card";
import { paginateClientSide } from "@/lib/paginate-client-side";
import type { Position, Trade } from "@/features/portfolio/types";

const PAGE_SIZE = 15;
const CHART_COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#84cc16"];

function currency(value: number | undefined): string {
  if (value === undefined) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

function AllocationChart({ positions }: { positions: Position[] }) {
  const data = useMemo(() => {
    const bySymbol = new Map<string, number>();
    for (const p of positions) {
      const notional = Math.abs(p.quantityUnits * p.averageEntryPrice);
      bySymbol.set(p.symbolCode, (bySymbol.get(p.symbolCode) ?? 0) + notional);
    }
    return Array.from(bySymbol.entries()).map(([name, value]) => ({ name, value }));
  }, [positions]);

  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">No open positions to allocate.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={(entry) => entry.name}>
          {data.map((_, i) => (
            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
          ))}
        </Pie>
        <RechartsTooltip formatter={(value: number) => currency(value)} />
      </PieChart>
    </ResponsiveContainer>
  );
}

function CurrencyExposure({ positions }: { positions: Position[] }) {
  // Derives base/quote currency from the symbolCode itself (e.g.
  // "EURUSD" -> base EUR, quote USD) — this app has no separate
  // per-instrument currency metadata joined to Position, only the
  // symbol string, so this is a best-effort parse rather than
  // authoritative instrument data. 6-character symbols only; anything
  // else (crypto pairs, indices) is grouped under "Other".
  const exposure = useMemo(() => {
    const byCurrency = new Map<string, number>();
    for (const p of positions) {
      const notional = Math.abs(p.quantityUnits * p.averageEntryPrice);
      const base = /^[A-Z]{6}$/.test(p.symbolCode) ? p.symbolCode.slice(0, 3) : "Other";
      byCurrency.set(base, (byCurrency.get(base) ?? 0) + notional);
    }
    return Array.from(byCurrency.entries()).sort((a, b) => b[1] - a[1]);
  }, [positions]);

  if (exposure.length === 0) return <p className="text-sm text-muted-foreground">No open positions.</p>;

  return (
    <ul className="space-y-2 text-sm">
      {exposure.map(([currencyCode, notional]) => (
        <li key={currencyCode} className="flex items-center justify-between">
          <span>{currencyCode}</span>
          <span className="tabular-nums text-muted-foreground">{currency(notional)}</span>
        </li>
      ))}
    </ul>
  );
}

function PositionsTable({ positions, isLoading, status }: { positions: Position[]; isLoading: boolean; status: "OPEN" | "CLOSED" }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search, 300);

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toUpperCase();
    return positions.filter((p) => !q || p.symbolCode.toUpperCase().includes(q));
  }, [positions, debouncedSearch]);

  const { pageItems, meta } = paginateClientSide(filtered, page, PAGE_SIZE);

  return (
    <div className="space-y-3">
      <div className="relative max-w-xs">
        <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <Input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search symbol…"
          className="pl-8"
          aria-label="Search positions"
        />
      </div>

      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : pageItems.length === 0 ? (
        <EmptyState title={`No ${status.toLowerCase()} positions`} />
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Symbol</TableHead>
                <TableHead>Side</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Entry Price</TableHead>
                {status === "CLOSED" && <TableHead>Exit Price</TableHead>}
                {status === "CLOSED" && <TableHead>Realized P&amp;L</TableHead>}
                <TableHead>{status === "OPEN" ? "Opened" : "Closed"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageItems.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.symbolCode}</TableCell>
                  <TableCell>
                    <Badge variant={p.side === "LONG" ? "success" : "destructive"}>{p.side}</Badge>
                  </TableCell>
                  <TableCell className="tabular-nums">{p.quantityUnits.toLocaleString()}</TableCell>
                  <TableCell className="tabular-nums">{p.averageEntryPrice}</TableCell>
                  {status === "CLOSED" && <TableCell className="tabular-nums">{p.averageExitPrice ?? "—"}</TableCell>}
                  {status === "CLOSED" && (
                    <TableCell className={`tabular-nums ${(p.realizedPnl ?? 0) >= 0 ? "text-success" : "text-destructive"}`}>
                      {p.realizedPnl !== undefined ? currency(p.realizedPnl) : "—"}
                    </TableCell>
                  )}
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(status === "OPEN" ? p.openedAt : (p.closedAt ?? p.openedAt)).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <TablePagination pagination={meta} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}

function TradeHistoryTable({ trades, isLoading }: { trades: Trade[]; isLoading: boolean }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search, 300);

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toUpperCase();
    return [...trades].filter((t) => !q || t.symbolCode.toUpperCase().includes(q)).sort((a, b) => new Date(b.closedAt).getTime() - new Date(a.closedAt).getTime());
  }, [trades, debouncedSearch]);

  const { pageItems, meta } = paginateClientSide(filtered, page, PAGE_SIZE);

  return (
    <div className="space-y-3">
      <div className="relative max-w-xs">
        <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <Input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search symbol…"
          className="pl-8"
          aria-label="Search trade history"
        />
      </div>

      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : pageItems.length === 0 ? (
        <EmptyState title="No trades yet" />
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Symbol</TableHead>
                <TableHead>Side</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Entry</TableHead>
                <TableHead>Exit</TableHead>
                <TableHead>Realized P&amp;L</TableHead>
                <TableHead>Closed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageItems.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.symbolCode}</TableCell>
                  <TableCell>
                    <Badge variant={t.side === "LONG" ? "success" : "destructive"}>{t.side}</Badge>
                  </TableCell>
                  <TableCell className="tabular-nums">{t.quantityUnits.toLocaleString()}</TableCell>
                  <TableCell className="tabular-nums">{t.entryPrice}</TableCell>
                  <TableCell className="tabular-nums">{t.exitPrice}</TableCell>
                  <TableCell className={`tabular-nums ${t.realizedPnl >= 0 ? "text-success" : "text-destructive"}`}>{currency(t.realizedPnl)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{new Date(t.closedAt).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <TablePagination pagination={meta} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}

export default function PortfolioCenterPage() {
  const portfolioQuery = usePortfolio();
  const positionsQuery = usePositions();
  const tradesQuery = useTrades();
  const [positionTab, setPositionTab] = useState<"open" | "closed" | "history">("open");

  const positions = positionsQuery.data?.items ?? [];
  const openPositions = positions.filter((p) => p.status === "OPEN");
  const closedPositions = positions.filter((p) => p.status === "CLOSED");
  const trades = tradesQuery.data?.items ?? [];

  const performance = computePerformanceMetrics(trades);
  const dailyPnl = computeTodaysRealizedPnl(trades);
  const weeklyPnl = computeWeeklyRealizedPnl(trades);
  const monthlyPnl = computeMonthlyRealizedPnl(trades);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Portfolio Center</h1>
        <p className="text-sm text-muted-foreground">Positions, holdings, exposure, and trade history.</p>
      </div>

      {(portfolioQuery.isError || positionsQuery.isError || tradesQuery.isError) && (
        <Alert variant="destructive">
          <AlertDescription>Some portfolio data couldn&apos;t be loaded.</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Account Equity" icon={<Wallet className="h-4 w-4 text-muted-foreground" />} value={currency(portfolioQuery.data?.equity)} isLoading={portfolioQuery.isLoading} isError={portfolioQuery.isError} />
        <StatCard title="Available Cash" icon={<Wallet className="h-4 w-4 text-muted-foreground" />} value={currency(portfolioQuery.data?.cashBalance)} isLoading={portfolioQuery.isLoading} isError={portfolioQuery.isError} />
        <StatCard title="Buying Power" icon={<Wallet className="h-4 w-4 text-muted-foreground" />} value={currency(portfolioQuery.data?.buyingPower)} isLoading={portfolioQuery.isLoading} isError={portfolioQuery.isError} />
        <StatCard
          title="Margin Used"
          icon={<Wallet className="h-4 w-4 text-muted-foreground" />}
          value={currency(portfolioQuery.data?.marginUsed)}
          subtext={portfolioQuery.data ? `${currency(portfolioQuery.data.marginAvailable)} available` : undefined}
          isLoading={portfolioQuery.isLoading}
          isError={portfolioQuery.isError}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Daily P&L" icon={dailyPnl >= 0 ? <TrendingUp className="h-4 w-4 text-success" /> : <TrendingDown className="h-4 w-4 text-destructive" />} value={currency(dailyPnl)} valueClassName={dailyPnl >= 0 ? "text-success" : "text-destructive"} isLoading={tradesQuery.isLoading} isError={tradesQuery.isError} />
        <StatCard title="Weekly P&L" icon={weeklyPnl >= 0 ? <TrendingUp className="h-4 w-4 text-success" /> : <TrendingDown className="h-4 w-4 text-destructive" />} value={currency(weeklyPnl)} valueClassName={weeklyPnl >= 0 ? "text-success" : "text-destructive"} isLoading={tradesQuery.isLoading} isError={tradesQuery.isError} />
        <StatCard title="Monthly P&L" icon={monthlyPnl >= 0 ? <TrendingUp className="h-4 w-4 text-success" /> : <TrendingDown className="h-4 w-4 text-destructive" />} value={currency(monthlyPnl)} valueClassName={monthlyPnl >= 0 ? "text-success" : "text-destructive"} isLoading={tradesQuery.isLoading} isError={tradesQuery.isError} />
        <StatCard title="Realized P&L (all time)" icon={<Wallet className="h-4 w-4 text-muted-foreground" />} value={currency(performance.realizedPnl)} valueClassName={performance.realizedPnl >= 0 ? "text-success" : "text-destructive"} subtext={`${performance.winRate.toFixed(0)}% win rate`} isLoading={tradesQuery.isLoading} isError={tradesQuery.isError} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <PieChartIcon className="h-4 w-4" aria-hidden="true" />
              Asset Allocation (open positions, by notional)
            </CardTitle>
          </CardHeader>
          <CardContent>{positionsQuery.isLoading ? <Skeleton className="h-56 w-full" /> : <AllocationChart positions={openPositions} />}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Currency Exposure</CardTitle>
          </CardHeader>
          <CardContent>{positionsQuery.isLoading ? <Skeleton className="h-56 w-full" /> : <CurrencyExposure positions={openPositions} />}</CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        <Tabs value={positionTab} onValueChange={(v) => setPositionTab(v as typeof positionTab)}>
          <TabsList>
            <TabsTrigger value="open">Open Positions ({openPositions.length})</TabsTrigger>
            <TabsTrigger value="closed">Closed Positions ({closedPositions.length})</TabsTrigger>
            <TabsTrigger value="history">Trade History ({trades.length})</TabsTrigger>
          </TabsList>
        </Tabs>

        {positionTab === "open" && <PositionsTable positions={openPositions} isLoading={positionsQuery.isLoading} status="OPEN" />}
        {positionTab === "closed" && <PositionsTable positions={closedPositions} isLoading={positionsQuery.isLoading} status="CLOSED" />}
        {positionTab === "history" && <TradeHistoryTable trades={trades} isLoading={tradesQuery.isLoading} />}
      </div>
    </div>
  );
}
