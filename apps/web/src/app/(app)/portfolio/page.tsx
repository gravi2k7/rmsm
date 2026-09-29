"use client";

import { useMemo, useState } from "react";
import { Search, Wallet, TrendingUp, TrendingDown, PieChart as PieChartIcon, Gauge, ShieldCheck, Banknote } from "lucide-react";
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
  useTradingPortfolioData,
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
  if (value === undefined || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

function AllocationChart({ positions }: { positions: Position[] }) {
  const data = useMemo(() => {
    const bySymbol = new Map<string, number>();
    for (const p of positions) {
      const notional = Math.abs(p.quantityUnits * p.averageEntryPrice);
      if (!Number.isFinite(notional)) continue;
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
      if (!Number.isFinite(notional)) continue;
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
    return positions.filter(
      (p) => !q || p.symbolCode.toUpperCase().includes(q),
    );
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
          placeholder="Search instrument…"
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
              {status === "OPEN" ? (
                <TableRow>
                  <TableHead>Instrument</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>BUY/SELL</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Entry</TableHead>
                  <TableHead className="text-right">Current</TableHead>
                  <TableHead className="text-right">
                    Unrealized P&amp;L
                  </TableHead>
                  <TableHead className="text-right">Margin</TableHead>
                </TableRow>
              ) : (
                <TableRow>
                  <TableHead>Instrument</TableHead>
                  <TableHead>Side</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Entry Price</TableHead>
                  <TableHead>Exit Price</TableHead>
                  <TableHead>Realized P&amp;L</TableHead>
                  <TableHead>Closed</TableHead>
                </TableRow>
              )}
            </TableHeader>

            <TableBody>
              {pageItems.map((p) => {
                if (status === "OPEN") {
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">
                        {p.symbolCode}
                      </TableCell>

                      <TableCell>
                        {p.accountName ?? "—"}
                      </TableCell>

                      <TableCell>
                        <Badge
                          variant={
                            p.side === "LONG"
                              ? "success"
                              : "destructive"
                          }
                        >
                          {p.side === "LONG" ? "BUY" : "SELL"}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-right tabular-nums">
                        {Number.isFinite(p.quantityUnits)
                          ? p.quantityUnits.toLocaleString()
                          : "—"}
                      </TableCell>

                      <TableCell className="text-right tabular-nums">
                        {Number.isFinite(p.averageEntryPrice)
                          ? p.averageEntryPrice
                          : "—"}
                      </TableCell>

                      <TableCell className="text-right tabular-nums">
                        {p.currentPrice !== undefined
                          ? p.currentPrice
                          : "—"}
                      </TableCell>

                      <TableCell
                        className={`text-right tabular-nums ${
                          (p.unrealizedPnl ?? 0) >= 0
                            ? "text-success"
                            : "text-destructive"
                        }`}
                      >
                        {p.unrealizedPnl !== undefined
                          ? currency(p.unrealizedPnl)
                          : "—"}
                      </TableCell>

                      <TableCell className="text-right tabular-nums">
                        {p.margin !== undefined
                          ? currency(p.margin)
                          : "—"}
                      </TableCell>
                    </TableRow>
                  );
                }

                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      {p.symbolCode}
                    </TableCell>

                    <TableCell>
                      <Badge
                        variant={
                          p.side === "LONG"
                            ? "success"
                            : "destructive"
                        }
                      >
                        {p.side}
                      </Badge>
                    </TableCell>

                    <TableCell className="tabular-nums">
                      {Number.isFinite(p.quantityUnits)
                        ? p.quantityUnits.toLocaleString()
                        : "—"}
                    </TableCell>

                    <TableCell className="tabular-nums">
                      {Number.isFinite(p.averageEntryPrice)
                        ? p.averageEntryPrice
                        : "—"}
                    </TableCell>

                    <TableCell className="tabular-nums">
                      {p.averageExitPrice ?? "—"}
                    </TableCell>

                    <TableCell
                      className={`tabular-nums ${
                        (p.realizedPnl ?? 0) >= 0
                          ? "text-success"
                          : "text-destructive"
                      }`}
                    >
                      {p.realizedPnl !== undefined
                        ? currency(p.realizedPnl)
                        : "—"}
                    </TableCell>

                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(
                        p.closedAt ?? p.openedAt,
                      ).toLocaleString()}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          <TablePagination
            pagination={meta}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  );
}

function TradeHistoryTable({
  trades,
  isLoading,
}: {
  trades: Trade[];
  isLoading: boolean;
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search, 300);

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toUpperCase();

    return [...trades]
      .filter(
        (t) =>
          !q ||
          t.symbolCode.toUpperCase().includes(q) ||
          (t.accountName ?? "").toUpperCase().includes(q),
      )
      .sort(
        (a, b) =>
          new Date(b.closedAt).getTime() -
          new Date(a.closedAt).getTime(),
      );
  }, [trades, debouncedSearch]);

  const { pageItems, meta } = paginateClientSide(
    filtered,
    page,
    PAGE_SIZE,
  );

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
          placeholder="Search instrument…"
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
                <TableHead>Time</TableHead>
                <TableHead>Instrument</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>BUY/SELL</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">P&amp;L</TableHead>
                <TableHead>Type</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {pageItems.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                    {new Date(t.closedAt).toLocaleString()}
                  </TableCell>

                  <TableCell className="font-medium">
                    {t.symbolCode}
                  </TableCell>

                  <TableCell>
                    {t.accountName ?? "—"}
                  </TableCell>

                  <TableCell>
                    <Badge
                      variant={
                        t.side === "LONG"
                          ? "success"
                          : "destructive"
                      }
                    >
                      {t.side === "LONG" ? "BUY" : "SELL"}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-right tabular-nums">
                    {t.quantityUnits.toLocaleString()}
                  </TableCell>

                  <TableCell className="text-right tabular-nums">
                    {t.exitPrice}
                  </TableCell>

                  <TableCell
                    className={`text-right tabular-nums ${
                      t.realizedPnl >= 0
                        ? "text-success"
                        : "text-destructive"
                    }`}
                  >
                    {currency(t.realizedPnl)}
                  </TableCell>

                  <TableCell>
                    {t.type ?? "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <TablePagination
            pagination={meta}
            onPageChange={setPage}
          />
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

  const portfolioAccountIds = useMemo(
    () => demoTradingAccounts.map((account) => account.id),
    [demoTradingAccounts],
  );

  const portfolioTradingData = useTradingPortfolioData(
    organizationId,
    portfolioAccountIds,
  );

  const createDemoAccount = useCreateDemoTradingAccount(organizationId);

  const maintenance = useTradingAccountMaintenance(organizationId, activeAccountId);

  const portfolioPositions = useMemo(() => {
    return portfolioAccountIds.flatMap((accountId, index) =>
      (portfolioTradingData.positionQueries[index]?.data ?? []).map((position) => ({
        ...position,
        accountId,
      })),
    );
  }, [portfolioAccountIds, portfolioTradingData.positionQueries]);

  const portfolioInstrumentIds = useMemo(
    () =>
      Array.from(
        new Set(
          portfolioPositions.map((position) => position.instrumentId),
        ),
      ),
    [portfolioPositions],
  );

  const portfolioInstrumentsQuery = useInstrumentsBatch(portfolioInstrumentIds);

  const portfolioInstrumentById = useMemo(() => {
    const map = new Map<string, { symbol: string; currency: string }>();

    for (const instrument of portfolioInstrumentsQuery.data ?? []) {
      map.set(instrument.id, {
        symbol: instrument.symbol,
        currency: instrument.currency,
      });
    }

    return map;
  }, [portfolioInstrumentsQuery.data]);

  const portfolioQuotesQuery = useQuotes(portfolioInstrumentIds);

  const portfolioQuoteByInstrumentId = useMemo(() => {
    const map = new Map<
      string,
      {
        bidPrice?: string | null;
        askPrice?: string | null;
        lastPrice?: string | null;
      }
    >();

    for (const quote of portfolioQuotesQuery.data ?? []) {
      map.set(quote.instrumentId, quote);
    }

    return map;
  }, [portfolioQuotesQuery.data]);

  const accountMetrics = useMemo(() => {
    return demoTradingAccounts.map((account) => {
      const accountPositions = portfolioPositions.filter(
        (position) =>
          position.accountId === account.id &&
          position.status === "OPEN",
      );

      const balance = Number(account.balance);
      const leverage = Number(account.leverage);

      let unrealizedPnl = 0;
      let marginUsed = 0;

      for (const position of accountPositions) {
        const quantity = Number(position.quantity);
        const entry = Number(position.averageEntryPrice);

        if (!Number.isFinite(quantity) || !Number.isFinite(entry)) {
          continue;
        }

        const quote = portfolioQuoteByInstrumentId.get(position.instrumentId);

        const currentPrice =
          position.side === "LONG"
            ? Number(quote?.bidPrice ?? quote?.lastPrice)
            : Number(quote?.askPrice ?? quote?.lastPrice);

        if (Number.isFinite(currentPrice)) {
          unrealizedPnl +=
            position.side === "LONG"
              ? (currentPrice - entry) * quantity
              : (entry - currentPrice) * quantity;
        }

        if (Number.isFinite(leverage) && leverage > 0) {
          marginUsed += Math.abs(quantity * entry) / leverage;
        }
      }

      const equity =
        Number.isFinite(balance) ? balance + unrealizedPnl : undefined;

      const marginLevel =
        marginUsed > 0 && equity !== undefined
          ? (equity / marginUsed) * 100
          : undefined;

      return {
        accountId: account.id,
        balance: Number.isFinite(balance) ? balance : undefined,
        equity,
        availableCash: Number.isFinite(balance) ? balance : undefined,
        marginUsed,
        marginLevel,
        leverage:
          Number.isFinite(leverage) && leverage > 0
            ? leverage
            : undefined,
        unrealizedPnl,
      };
    });
  }, [
    demoTradingAccounts,
    portfolioPositions,
    portfolioQuoteByInstrumentId,
  ]);

  const accountMetricsById = useMemo(
    () =>
      new Map(
        accountMetrics.map((metrics) => [metrics.accountId, metrics]),
      ),
    [accountMetrics],
  );

  const portfolioCurrency = useMemo(() => {
    const currencies = new Set(
      demoTradingAccounts
        .map((account) => account.currency)
        .filter(Boolean),
    );

    return currencies.size === 1 ? Array.from(currencies)[0] : undefined;
  }, [demoTradingAccounts]);

  const portfolioSummary = useMemo(() => {
    let totalBalance = 0;
    let totalUnrealizedPnl = 0;
    let totalMarginUsed = 0;
    let hasBalance = false;

    for (const metrics of accountMetrics) {
      if (metrics.balance !== undefined) {
        totalBalance += metrics.balance;
        hasBalance = true;
      }

      totalUnrealizedPnl += metrics.unrealizedPnl;
      totalMarginUsed += metrics.marginUsed;
    }

    const totalEquity = hasBalance
      ? totalBalance + totalUnrealizedPnl
      : undefined;

    const availableMargin =
      totalEquity !== undefined
        ? Math.max(totalEquity - totalMarginUsed, 0)
        : undefined;

    return {
      totalBalance: hasBalance ? totalBalance : undefined,
      totalEquity,
      totalUnrealizedPnl,
      totalMarginUsed,
      availableMargin,
    };
  }, [accountMetrics]);

  const portfolioRealizedPerformance = useMemo(() => {
    let realizedPnl = 0;
    let winningTrades = 0;
    let totalTrades = 0;

    for (const query of portfolioTradingData.tradeQueries) {
      for (const trade of query.data ?? []) {
        const pnl = Number(trade.realizedPnl);

        if (!Number.isFinite(pnl)) {
          continue;
        }

        realizedPnl += pnl;
        totalTrades += 1;

        if (pnl > 0) {
          winningTrades += 1;
        }
      }
    }

    return {
      realizedPnl,
      winRate: totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0,
    };
  }, [portfolioTradingData.tradeQueries]);

  const accountById = useMemo(
    () => new Map(demoTradingAccounts.map((account) => [account.id, account])),
    [demoTradingAccounts],
  );

  const positions: Position[] = useMemo(
    () =>
      portfolioPositions.map((position) => {
        const account = accountById.get(position.accountId);
        const instrument = portfolioInstrumentById.get(position.instrumentId);
        const quote = portfolioQuoteByInstrumentId.get(position.instrumentId);

        const quantity = Number(position.quantity);
        const entry = Number(position.averageEntryPrice);
        const leverage = Number(account?.leverage);

        const currentPrice =
          position.status === "OPEN"
            ? position.side === "LONG"
              ? Number(quote?.bidPrice ?? quote?.lastPrice)
              : Number(quote?.askPrice ?? quote?.lastPrice)
            : undefined;

        const unrealizedPnl =
          position.status === "OPEN" &&
          Number.isFinite(quantity) &&
          Number.isFinite(entry) &&
          currentPrice !== undefined &&
          Number.isFinite(currentPrice)
            ? position.side === "LONG"
              ? (currentPrice - entry) * quantity
              : (entry - currentPrice) * quantity
            : undefined;

        const margin =
          Number.isFinite(quantity) &&
          Number.isFinite(entry) &&
          Number.isFinite(leverage) &&
          leverage > 0
            ? Math.abs(quantity * entry) / leverage
            : undefined;

        return {
          id: position.id,
          symbolCode: instrument?.symbol ?? "Unknown",
          side: position.side,
          quantityUnits: quantity,
          averageEntryPrice: entry,
          status: position.status,
          openedAt: position.openedAt,
          closedAt: position.closedAt ?? undefined,
          averageExitPrice: position.averageExitPrice
            ? Number(position.averageExitPrice)
            : undefined,
          realizedPnl: position.realizedPnl
            ? Number(position.realizedPnl)
            : undefined,
          accountName: account?.name,
          currentPrice,
          unrealizedPnl,
          margin,
        };
      }),
    [
      portfolioPositions,
      accountById,
      portfolioInstrumentById,
      portfolioQuoteByInstrumentId,
    ],
  );

  const openPositions = positions.filter((p) => p.status === "OPEN");
  const closedPositions = positions.filter((p) => p.status === "CLOSED");


  const trades: Trade[] = useMemo(
    () =>
      portfolioTradingData.tradeQueries.flatMap(
        (query, index) =>
          (query.data ?? []).map((trade) => {
            const accountId = portfolioAccountIds[index];
            const account = accountId
              ? accountById.get(accountId)
              : undefined;
            const instrument = portfolioInstrumentById.get(trade.instrumentId);

            return {
              id: trade.id,
              symbolCode: instrument?.symbol ?? "Unknown",
              side: trade.side,
              quantityUnits: Number(trade.quantity),
              entryPrice: Number(trade.entryPrice),
              exitPrice: Number(trade.exitPrice),
              realizedPnl: Number(trade.realizedPnl),
              isWin: Number(trade.realizedPnl) > 0,
              openedAt: trade.openedAt,
              closedAt: trade.closedAt,
              accountName: account?.name,
              type: undefined,
            };
          }),
      ),
    [
      portfolioTradingData.tradeQueries,
      portfolioAccountIds,
      accountById,
      portfolioInstrumentById,
    ],
  );


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
        portfolioTradingData.isError) && (
        <Alert variant="destructive">
          <AlertDescription>Some trading account data couldn&apos;t be loaded.</AlertDescription>
        </Alert>
      )}

      <PortfolioTradingAccounts
        accounts={demoTradingAccounts}
        accountMetrics={accountMetricsById}
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
        onUpdateLeverage={async (account, leverage) => {
          if (account.type !== "DEMO" || account.status !== "ACTIVE") {
            return;
          }

          await maintenance.updateLeverage.mutateAsync({
            accountId: account.id,
            leverage,
          });
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
        isUpdatingLeverage={maintenance.updateLeverage.isPending}
        updatingLeverageAccountId={
          maintenance.updateLeverage.variables?.accountId ?? null
        }
        leverageError={
          maintenance.updateLeverage.isError
            ? maintenance.updateLeverage.error instanceof Error
              ? maintenance.updateLeverage.error.message
              : "Unable to update leverage."
            : null
        }
      />
      <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-6">
        <StatCard
          title="Total Equity"
          icon={<Wallet className="text-muted-foreground h-4 w-4" />}
          value={currency(portfolioSummary.totalEquity)}
          subtext={`${demoTradingAccounts.length} active account${demoTradingAccounts.length === 1 ? "" : "s"}`}
          isLoading={tradingAccountsQuery.isLoading}
          isError={tradingAccountsQuery.isError}
        />
        <StatCard
          title="Total Balance"
          icon={<Banknote className="text-muted-foreground h-4 w-4" />}
          value={currency(portfolioSummary.totalBalance)}
          subtext={portfolioCurrency ?? "Mixed currencies"}
          isLoading={tradingAccountsQuery.isLoading}
          isError={tradingAccountsQuery.isError}
        />
        <StatCard
          title="Unrealized P&L"
          icon={
            portfolioSummary.totalUnrealizedPnl >= 0 ? (
              <TrendingUp className="text-success h-4 w-4" />
            ) : (
              <TrendingDown className="text-destructive h-4 w-4" />
            )
          }
          value={currency(portfolioSummary.totalUnrealizedPnl)}
          valueClassName={
            portfolioSummary.totalUnrealizedPnl >= 0
              ? "text-success"
              : "text-destructive"
          }
          subtext="Open positions"
          isLoading={portfolioTradingData.isLoading}
          isError={portfolioTradingData.isError}
        />
        <StatCard
          title="Realized P&L"
          icon={
            portfolioRealizedPerformance.realizedPnl >= 0 ? (
              <TrendingUp className="text-success h-4 w-4" />
            ) : (
              <TrendingDown className="text-destructive h-4 w-4" />
            )
          }
          value={currency(portfolioRealizedPerformance.realizedPnl)}
          valueClassName={
            portfolioRealizedPerformance.realizedPnl >= 0
              ? "text-success"
              : "text-destructive"
          }
          subtext={`${portfolioRealizedPerformance.winRate.toFixed(0)}% win rate`}
          isLoading={portfolioTradingData.isLoading}
          isError={portfolioTradingData.isError}
        />
        <StatCard
          title="Margin Used"
          icon={<ShieldCheck className="text-muted-foreground h-4 w-4" />}
          value={currency(portfolioSummary.totalMarginUsed)}
          subtext="Estimated"
          isLoading={portfolioTradingData.isLoading}
          isError={portfolioTradingData.isError}
        />
        <StatCard
          title="Available Margin"
          icon={<Gauge className="text-muted-foreground h-4 w-4" />}
          value={currency(portfolioSummary.availableMargin)}
          subtext="Estimated"
          isLoading={portfolioTradingData.isLoading}
          isError={portfolioTradingData.isError}
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
          isLoading={portfolioTradingData.isLoading}
          isError={portfolioTradingData.isError}
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
          isLoading={portfolioTradingData.isLoading}
          isError={portfolioTradingData.isError}
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
          isLoading={portfolioTradingData.isLoading}
          isError={portfolioTradingData.isError}
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
            {portfolioTradingData.isLoading ? (
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
            {portfolioTradingData.isLoading ? (
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
            isLoading={portfolioTradingData.isLoading}
            status="OPEN"
          />
        )}
        {positionTab === "closed" && (
          <PositionsTable
            positions={closedPositions}
            isLoading={portfolioTradingData.isLoading}
            status="CLOSED"
          />
        )}
        {positionTab === "history" && (
          <TradeHistoryTable trades={trades} isLoading={portfolioTradingData.isLoading} />
        )}
      </div>
    </div>
  );
}
