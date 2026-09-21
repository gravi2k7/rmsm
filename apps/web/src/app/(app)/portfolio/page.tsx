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

import {
  computePerformanceMetrics,
  computeTodaysRealizedPnl,
  computeWeeklyRealizedPnl,
  computeMonthlyRealizedPnl,
} from "@/features/portfolio/lib/performance";
import { StatCard } from "@/features/dashboard/components/widget-card";
import { paginateClientSide } from "@/lib/paginate-client-side";
import type { Position, Trade } from "@/features/portfolio/types";
import { useSessionStore } from "@/lib/session-store";
import {
  useTradingAccounts,
  useTradingPositions,
  useTradingTrades,
} from "@/features/trading/hooks/use-trading-accounts";
import { useInstrumentsBatch, useQuotes } from "@/features/market/hooks/use-market-data";
import { useCreateDemoTradingAccount } from "@/features/trading/hooks/use-create-demo-trading-account";
import { useTradingAccountMaintenance } from "@/features/trading/hooks/use-trading-account-maintenance";
import { PortfolioTradingAccounts } from "@/features/trading/components/portfolio-trading-accounts";

const PAGE_SIZE = 15;
const CHART_COLORS = [
  "#3b82f6",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#ec4899",
  "#84cc16",
];

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
    return <p className="text-muted-foreground text-sm">No open positions to allocate.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={80}
          label={(entry) => entry.name}
        >
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

  if (exposure.length === 0)
    return <p className="text-muted-foreground text-sm">No open positions.</p>;

  return (
    <ul className="space-y-2 text-sm">
      {exposure.map(([currencyCode, notional]) => (
        <li key={currencyCode} className="flex items-center justify-between">
          <span>{currencyCode}</span>
          <span className="text-muted-foreground tabular-nums">{currency(notional)}</span>
        </li>
      ))}
    </ul>
  );
}

function PositionsTable({
  positions,
  isLoading,
  status,
}: {
  positions: Position[];
  isLoading: boolean;
  status: "OPEN" | "CLOSED";
}) {
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
        <Search
          className="text-muted-foreground pointer-events-none absolute left-2.5 top-2.5 h-4 w-4"
          aria-hidden="true"
        />
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
                  {status === "CLOSED" && (
                    <TableCell className="tabular-nums">{p.averageExitPrice ?? "—"}</TableCell>
                  )}
                  {status === "CLOSED" && (
                    <TableCell
                      className={`tabular-nums ${(p.realizedPnl ?? 0) >= 0 ? "text-success" : "text-destructive"}`}
                    >
                      {p.realizedPnl !== undefined ? currency(p.realizedPnl) : "—"}
                    </TableCell>
                  )}
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(
                      status === "OPEN" ? p.openedAt : (p.closedAt ?? p.openedAt),
                    ).toLocaleString()}
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
    return [...trades]
      .filter((t) => !q || t.symbolCode.toUpperCase().includes(q))
      .sort((a, b) => new Date(b.closedAt).getTime() - new Date(a.closedAt).getTime());
  }, [trades, debouncedSearch]);

  const { pageItems, meta } = paginateClientSide(filtered, page, PAGE_SIZE);

  return (
    <div className="space-y-3">
      <div className="relative max-w-xs">
        <Search
          className="text-muted-foreground pointer-events-none absolute left-2.5 top-2.5 h-4 w-4"
          aria-hidden="true"
        />
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
                <TableHead>Open Time</TableHead>
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
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(t.openedAt).toLocaleString()}
                  </TableCell>
                  <TableCell
                    className={`tabular-nums ${t.realizedPnl >= 0 ? "text-success" : "text-destructive"}`}
                  >
                    {currency(t.realizedPnl)}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(t.closedAt).toLocaleString()}
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

export default function PortfolioCenterPage() {
  const [positionTab, setPositionTab] = useState<"open" | "closed" | "history">("open");

  const organizationId = useSessionStore((state) => state.organizationId) ?? undefined;

  const tradingAccountsQuery = useTradingAccounts(organizationId);

  const demoTradingAccounts = useMemo(
    () =>
      (tradingAccountsQuery.data ?? []).filter(
        (account) => account.type === "DEMO" && account.status !== "CLOSED",
      ),
    [tradingAccountsQuery.data],
  );

  const [selectedAccountId, setSelectedAccountId] = useState<string | undefined>(undefined);

  const activeAccountId = selectedAccountId ?? demoTradingAccounts[0]?.id;

  const tradingPositionsQuery = useTradingPositions(organizationId, activeAccountId);

  const tradingTradesQuery = useTradingTrades(organizationId, activeAccountId);

  const instrumentIds = useMemo(
    () =>
      Array.from(
        new Set([
          ...(tradingPositionsQuery.data ?? []).map((position) => position.instrumentId),
          ...(tradingTradesQuery.data ?? []).map((trade) => trade.instrumentId),
        ]),
      ),
    [tradingPositionsQuery.data, tradingTradesQuery.data],
  );

  const instrumentsQuery = useInstrumentsBatch(instrumentIds);

  const instrumentById = useMemo(() => {
    const map = new Map<string, { symbol: string; currency: string }>();

    for (const instrument of instrumentsQuery.data ?? []) {
      map.set(instrument.id, {
        symbol: instrument.symbol,
        currency: instrument.currency,
      });
    }

    return map;
  }, [instrumentsQuery.data]);

  const quoteQuery = useQuotes(instrumentIds);

  const quoteByInstrumentId = useMemo(() => {
    const map = new Map<
      string,
      {
        bidPrice?: string | null;
        askPrice?: string | null;
        lastPrice?: string | null;
      }
    >();

    (quoteQuery.data ?? []).forEach((quote) => {
      map.set(quote.instrumentId, quote);
    });

    return map;
  }, [quoteQuery.data]);

  const createDemoAccount = useCreateDemoTradingAccount(organizationId);

  const maintenance = useTradingAccountMaintenance(organizationId, activeAccountId);

  const positions: Position[] = useMemo(
    () =>
      (tradingPositionsQuery.data ?? []).map((position) => ({
        id: position.id,
        symbolCode: instrumentById.get(position.instrumentId)?.symbol ?? "Unknown",
        side: position.side,
        quantityUnits: Number(position.quantity),
        averageEntryPrice: Number(position.averageEntryPrice),
        status: position.status,
        openedAt: position.openedAt,
        closedAt: position.closedAt ?? undefined,
        averageExitPrice: position.averageExitPrice ? Number(position.averageExitPrice) : undefined,
        realizedPnl: position.realizedPnl ? Number(position.realizedPnl) : undefined,
      })),
    [tradingPositionsQuery.data, instrumentById],
  );

  const openPositions = positions.filter((p) => p.status === "OPEN");

  const closedPositions = positions.filter((p) => p.status === "CLOSED");

  const trades: Trade[] = useMemo(
    () =>
      (tradingTradesQuery.data ?? []).map((trade) => ({
        id: trade.id,
        symbolCode: instrumentById.get(trade.instrumentId)?.symbol ?? "Unknown",
        side: trade.side,
        quantityUnits: Number(trade.quantity),
        entryPrice: Number(trade.entryPrice),
        exitPrice: Number(trade.exitPrice),
        realizedPnl: Number(trade.realizedPnl),
        isWin: Number(trade.realizedPnl) > 0,
        openedAt: trade.openedAt,
        closedAt: trade.closedAt,
      })),
    [tradingTradesQuery.data, instrumentById],
  );

  const activeAccount = demoTradingAccounts.find((account) => account.id === activeAccountId);

  const accountBalance = activeAccount ? Number(activeAccount.balance) : undefined;

  const unrealizedPnl = useMemo(() => {
    let total = 0;

    for (const position of (tradingPositionsQuery.data ?? []).filter(
      (position) => position.status === "OPEN",
    )) {
      const quote = quoteByInstrumentId.get(position.instrumentId);

      const quantity = Number(position.quantity);

      const entry = Number(position.averageEntryPrice);

      if (!quote || !Number.isFinite(quantity) || !Number.isFinite(entry)) {
        continue;
      }

      const executablePrice =
        position.side === "LONG"
          ? Number(quote.bidPrice ?? quote.lastPrice)
          : Number(quote.askPrice ?? quote.lastPrice);

      if (!Number.isFinite(executablePrice)) {
        continue;
      }

      total +=
        position.side === "LONG"
          ? (executablePrice - entry) * quantity
          : (entry - executablePrice) * quantity;
    }

    return total;
  }, [tradingPositionsQuery.data, quoteByInstrumentId]);

  const accountEquity = accountBalance !== undefined ? accountBalance + unrealizedPnl : undefined;

  const availableCash = accountBalance;
  const buyingPower = accountBalance;
  const marginUsed = 0;
  const marginAvailable = accountBalance;

  const performance = computePerformanceMetrics(trades);
  const dailyPnl = computeTodaysRealizedPnl(trades);
  const weeklyPnl = computeWeeklyRealizedPnl(trades);
  const monthlyPnl = computeMonthlyRealizedPnl(trades);

  return (
    <div className="rmsm-mobile-glass-page w-full min-w-0 space-y-4 overflow-x-hidden pb-8 sm:space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Portfolio Center</h1>
        <p className="text-muted-foreground text-sm">
          Positions, holdings, exposure, and trade history.
        </p>
      </div>

      {(tradingAccountsQuery.isError ||
        tradingPositionsQuery.isError ||
        tradingTradesQuery.isError) && (
        <Alert variant="destructive">
          <AlertDescription>Some trading account data couldn&apos;t be loaded.</AlertDescription>
        </Alert>
      )}

      <PortfolioTradingAccounts
        accounts={demoTradingAccounts}
        isLoading={tradingAccountsQuery.isLoading}
        errorMessage={
          tradingAccountsQuery.isError
            ? tradingAccountsQuery.error instanceof Error
              ? tradingAccountsQuery.error.message
              : "Unable to load trading accounts."
            : null
        }
        onCreate={(input) => {
          void createDemoAccount.mutateAsync({
            ...input,
            leverage: input.leverage ?? 10,
          });
        }}
        onAddFunds={(account, amount) => {
          setSelectedAccountId(account.id);
          void maintenance.addFunds.mutateAsync(amount);
        }}
        onReset={(account) => {
          setSelectedAccountId(account.id);
          void maintenance.reset.mutateAsync();
        }}
        isCreating={createDemoAccount.isPending}
        creatingError={
          createDemoAccount.isError
            ? createDemoAccount.error instanceof Error
              ? createDemoAccount.error.message
              : "Unable to create Demo account."
            : null
        }
        isAddingFunds={maintenance.addFunds.isPending}
        addingFundsAccountId={activeAccountId}
        isResetting={maintenance.reset.isPending}
        resettingAccountId={activeAccountId}
      />
      <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-4">
        <StatCard
          title="Account Equity"
          icon={<Wallet className="text-muted-foreground h-4 w-4" />}
          value={currency(accountEquity)}
          isLoading={tradingAccountsQuery.isLoading}
          isError={tradingAccountsQuery.isError}
        />
        <StatCard
          title="Available Cash"
          icon={<Wallet className="text-muted-foreground h-4 w-4" />}
          value={currency(availableCash)}
          isLoading={tradingAccountsQuery.isLoading}
          isError={tradingAccountsQuery.isError}
        />
        <StatCard
          title="Buying Power"
          icon={<Wallet className="text-muted-foreground h-4 w-4" />}
          value={currency(buyingPower)}
          isLoading={tradingAccountsQuery.isLoading}
          isError={tradingAccountsQuery.isError}
        />
        <StatCard
          title="Margin Used"
          icon={<Wallet className="text-muted-foreground h-4 w-4" />}
          value={currency(marginUsed)}
          subtext={`${currency(marginAvailable)} available`}
          isLoading={tradingAccountsQuery.isLoading}
          isError={tradingAccountsQuery.isError}
        />
      </div>

      <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-4">
        <StatCard
          title="Daily P&L"
          icon={
            dailyPnl >= 0 ? (
              <TrendingUp className="text-success h-4 w-4" />
            ) : (
              <TrendingDown className="text-destructive h-4 w-4" />
            )
          }
          value={currency(dailyPnl)}
          valueClassName={dailyPnl >= 0 ? "text-success" : "text-destructive"}
          isLoading={tradingTradesQuery.isLoading}
          isError={tradingTradesQuery.isError}
        />
        <StatCard
          title="Weekly P&L"
          icon={
            weeklyPnl >= 0 ? (
              <TrendingUp className="text-success h-4 w-4" />
            ) : (
              <TrendingDown className="text-destructive h-4 w-4" />
            )
          }
          value={currency(weeklyPnl)}
          valueClassName={weeklyPnl >= 0 ? "text-success" : "text-destructive"}
          isLoading={tradingTradesQuery.isLoading}
          isError={tradingTradesQuery.isError}
        />
        <StatCard
          title="Monthly P&L"
          icon={
            monthlyPnl >= 0 ? (
              <TrendingUp className="text-success h-4 w-4" />
            ) : (
              <TrendingDown className="text-destructive h-4 w-4" />
            )
          }
          value={currency(monthlyPnl)}
          valueClassName={monthlyPnl >= 0 ? "text-success" : "text-destructive"}
          isLoading={tradingTradesQuery.isLoading}
          isError={tradingTradesQuery.isError}
        />
        <StatCard
          title="Realized P&L (all time)"
          icon={<Wallet className="text-muted-foreground h-4 w-4" />}
          value={currency(performance.realizedPnl)}
          valueClassName={performance.realizedPnl >= 0 ? "text-success" : "text-destructive"}
          subtext={`${performance.winRate.toFixed(0)}% win rate`}
          isLoading={tradingTradesQuery.isLoading}
          isError={tradingTradesQuery.isError}
        />
      </div>

      <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="px-3 py-3 sm:px-6 sm:py-4">
            <CardTitle className="flex items-center gap-2 text-xs sm:text-sm">
              <PieChartIcon className="h-4 w-4" aria-hidden="true" />
              Asset Allocation (open positions, by notional)
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3 sm:px-6 sm:pb-6">
            {tradingPositionsQuery.isLoading ? (
              <Skeleton className="h-56 w-full" />
            ) : (
              <AllocationChart positions={openPositions} />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="px-3 py-3 sm:px-6 sm:py-4">
            <CardTitle className="text-xs sm:text-sm">Currency Exposure</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3 sm:px-6 sm:pb-6">
            {tradingPositionsQuery.isLoading ? (
              <Skeleton className="h-56 w-full" />
            ) : (
              <CurrencyExposure positions={openPositions} />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="min-w-0 space-y-3">
        <Tabs value={positionTab} onValueChange={(v) => setPositionTab(v as typeof positionTab)}>
          <TabsList className="w-full overflow-x-auto">
            <TabsTrigger className="shrink-0" value="open">
              Open Positions ({openPositions.length})
            </TabsTrigger>
            <TabsTrigger className="shrink-0" value="closed">
              Closed Positions ({closedPositions.length})
            </TabsTrigger>
            <TabsTrigger className="shrink-0" value="history">
              Trade History ({trades.length})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {positionTab === "open" && (
          <PositionsTable
            positions={openPositions}
            isLoading={tradingPositionsQuery.isLoading}
            status="OPEN"
          />
        )}
        {positionTab === "closed" && (
          <PositionsTable
            positions={closedPositions}
            isLoading={tradingPositionsQuery.isLoading}
            status="CLOSED"
          />
        )}
        {positionTab === "history" && (
          <TradeHistoryTable trades={trades} isLoading={tradingTradesQuery.isLoading} />
        )}
      </div>
    </div>
  );
}
