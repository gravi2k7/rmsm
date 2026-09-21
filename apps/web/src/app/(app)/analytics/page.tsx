"use client";

import { useMemo, useState } from "react";
import { BarChart3, CalendarDays, TrendingDown, TrendingUp } from "lucide-react";
import {
  BarChart,
  Bar,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Alert,
  AlertDescription,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Skeleton,
} from "@rmsm/ui";

import { useSessionStore } from "@/lib/session-store";
import {
  useTradingAccounts,
  useTradingTrades,
} from "@/features/trading/hooks/use-trading-accounts";
import { useInstrumentsBatch } from "@/features/market/hooks/use-market-data";
import type { TradingTrade } from "@/features/trading/types";
import type { Trade } from "@/features/portfolio/types";
import {
  computeCumulativePnl,
  computeDrawdown,
  computePerformanceMetrics,
  computePerformanceByInstrument,
  computeWinLossAverages,
} from "@/features/portfolio/lib/performance";

function currency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function signedCurrency(value: number): string {
  return `${value >= 0 ? "+" : ""}${currency(value)}`;
}

function durationLabel(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return mins === 0 ? `${hours}h` : `${hours}h ${mins}m`;
}

function toAnalyticsTrade(trade: TradingTrade, symbolCode: string): Trade {
  const realizedPnl = Number(trade.realizedPnl ?? 0);

  return {
    id: trade.id,
    symbolCode,
    side: trade.side,
    quantityUnits: Number(trade.quantity),
    entryPrice: Number(trade.entryPrice),
    exitPrice: Number(trade.exitPrice),
    realizedPnl,
    isWin: realizedPnl > 0,
    openedAt: trade.openedAt,
    closedAt: trade.closedAt,
  };
}

function Stat({
  label,
  value,
  subtext,
  positive,
  negative,
}: {
  label: string;
  value: string;
  subtext?: string;
  positive?: boolean;
  negative?: boolean;
}) {
  return (
    <div className="bg-card rounded-xl border px-3 py-3 sm:px-4 sm:py-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide sm:text-xs">
          {label}
        </span>
      </div>
      <div
        className={[
          "text-xl font-semibold tabular-nums sm:text-2xl",
          positive ? "text-emerald-500" : "",
          negative ? "text-red-500" : "",
        ].join(" ")}
      >
        {value}
      </div>
      {subtext && <div className="text-muted-foreground mt-1 text-xs">{subtext}</div>}
    </div>
  );
}

function EmptyState({ text = "No closed trades yet." }: { text?: string }) {
  return (
    <div className="text-muted-foreground flex min-h-48 items-center justify-center text-sm">
      {text}
    </div>
  );
}

function CalendarHeatmap({
  days,
}: {
  days: { date: string; realizedPnl: number; tradeCount: number }[];
}) {
  if (days.length === 0) return <EmptyState />;

  const maxAbs = Math.max(1, ...days.map((day) => Math.abs(day.realizedPnl)));

  return (
    <div className="overflow-x-auto">
      <div className="flex min-w-max flex-wrap gap-1">
        {days.map((day) => {
          const intensity = Math.min(1, Math.abs(day.realizedPnl) / maxAbs);
          const positive = day.realizedPnl > 0;
          const negative = day.realizedPnl < 0;

          return (
            <div
              key={day.date}
              title={`${day.date}: ${currency(day.realizedPnl)} · ${day.tradeCount} trade${day.tradeCount === 1 ? "" : "s"}`}
              className="flex h-7 w-7 items-center justify-center rounded-md text-[9px] font-medium sm:h-8 sm:w-8 sm:text-[10px]"
              style={{
                backgroundColor: positive
                  ? `rgba(34,197,94,${0.15 + intensity * 0.7})`
                  : negative
                    ? `rgba(239,68,68,${0.15 + intensity * 0.7})`
                    : "hsl(var(--muted))",
                color: positive || negative ? "white" : "hsl(var(--muted-foreground))",
              }}
            >
              {day.date.slice(8, 10)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function AnalyticsCenterPage(): JSX.Element {
  const organizationId = useSessionStore((state) => state.organizationId) ?? undefined;

  const accountsQuery = useTradingAccounts(organizationId);

  const activeDemoAccounts = useMemo(
    () =>
      (accountsQuery.data ?? []).filter(
        (account) => account.type === "DEMO" && account.status === "ACTIVE",
      ),
    [accountsQuery.data],
  );

  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  const selectedAccount = useMemo(() => {
    if (activeDemoAccounts.length === 0) return undefined;

    const requested = selectedAccountId
      ? activeDemoAccounts.find((account) => account.id === selectedAccountId)
      : undefined;

    return requested ?? activeDemoAccounts[0];
  }, [activeDemoAccounts, selectedAccountId]);

  const tradingTradesQuery = useTradingTrades(organizationId, selectedAccount?.id);

  const rawTrades = useMemo(() => tradingTradesQuery.data ?? [], [tradingTradesQuery.data]);

  const instrumentIds = useMemo(
    () => [...new Set(rawTrades.map((trade) => trade.instrumentId))],
    [rawTrades],
  );

  const instrumentsQuery = useInstrumentsBatch(instrumentIds);

  const instrumentSymbols = useMemo(() => {
    const map = new Map<string, string>();

    for (const instrument of instrumentsQuery.data ?? []) {
      map.set(instrument.id, instrument.symbol);
    }

    return map;
  }, [instrumentsQuery.data]);

  const trades = useMemo(
    () =>
      rawTrades
        .filter((trade) => trade.closedAt != null)
        .map((trade) =>
          toAnalyticsTrade(trade, instrumentSymbols.get(trade.instrumentId) ?? "Unknown"),
        )
        .sort((a, b) => new Date(a.closedAt).getTime() - new Date(b.closedAt).getTime()),
    [rawTrades, instrumentSymbols],
  );

  const performance = useMemo(() => computePerformanceMetrics(trades), [trades]);

  const cumulativePnl = useMemo(() => computeCumulativePnl(trades), [trades]);

  const drawdown = useMemo(() => computeDrawdown(trades), [trades]);

  const winLoss = useMemo(() => computeWinLossAverages(trades), [trades]);

  const byInstrument = useMemo(() => computePerformanceByInstrument(trades), [trades]);

  const dailyPnl = useMemo(() => {
    const map = new Map<string, { date: string; realizedPnl: number; tradeCount: number }>();

    for (const trade of trades) {
      const date = trade.closedAt.slice(0, 10);
      const current = map.get(date) ?? {
        date,
        realizedPnl: 0,
        tradeCount: 0,
      };

      current.realizedPnl += trade.realizedPnl;
      current.tradeCount += 1;
      map.set(date, current);
    }

    return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
  }, [trades]);

  const monthlyPnl = useMemo(() => {
    const map = new Map<string, number>();

    for (const trade of trades) {
      const date = new Date(trade.closedAt);
      const key = date.toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      });

      map.set(key, (map.get(key) ?? 0) + trade.realizedPnl);
    }

    return [...map.entries()].map(([month, realizedPnl]) => ({
      month,
      realizedPnl,
    }));
  }, [trades]);

  const weekdayPnl = useMemo(() => {
    const order = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

    const map = new Map(order.map((day) => [day, { day, realizedPnl: 0, trades: 0 }]));

    for (const trade of trades) {
      const day = new Date(trade.closedAt).toLocaleDateString("en-US", {
        weekday: "short",
      });

      const current = map.get(day);
      if (current) {
        current.realizedPnl += trade.realizedPnl;
        current.trades += 1;
      }
    }

    return order.map((day) => map.get(day)!);
  }, [trades]);

  const directionStats = useMemo(() => {
    const long = trades.filter((trade) => trade.side === "LONG");
    const short = trades.filter((trade) => trade.side === "SHORT");

    return [
      {
        side: "LONG",
        trades: long.length,
        pnl: long.reduce((sum, trade) => sum + trade.realizedPnl, 0),
      },
      {
        side: "SHORT",
        trades: short.length,
        pnl: short.reduce((sum, trade) => sum + trade.realizedPnl, 0),
      },
    ];
  }, [trades]);

  const outcomeStats = useMemo(() => {
    const wins = trades.filter((trade) => trade.realizedPnl > 0);
    const losses = trades.filter((trade) => trade.realizedPnl < 0);

    return [
      {
        label: "Winning",
        count: wins.length,
        pnl: wins.reduce((sum, trade) => sum + trade.realizedPnl, 0),
      },
      {
        label: "Losing",
        count: losses.length,
        pnl: losses.reduce((sum, trade) => sum + trade.realizedPnl, 0),
      },
    ];
  }, [trades]);

  const streaks = useMemo(() => {
    let currentWin = 0;
    let currentLoss = 0;
    let maxWin = 0;
    let maxLoss = 0;

    for (const trade of trades) {
      if (trade.realizedPnl > 0) {
        currentWin += 1;
        currentLoss = 0;
        maxWin = Math.max(maxWin, currentWin);
      } else if (trade.realizedPnl < 0) {
        currentLoss += 1;
        currentWin = 0;
        maxLoss = Math.max(maxLoss, currentLoss);
      }
    }

    return { maxWin, maxLoss };
  }, [trades]);

  const durationStats = useMemo(() => {
    if (trades.length === 0) return { average: 0, total: 0 };

    const minutes = trades.map(
      (trade) => (new Date(trade.closedAt).getTime() - new Date(trade.openedAt).getTime()) / 60000,
    );

    return {
      average: minutes.reduce((sum, value) => sum + value, 0) / minutes.length,
      total: minutes.reduce((sum, value) => sum + value, 0),
    };
  }, [trades]);

  const bestTrade = useMemo(
    () =>
      trades.length > 0
        ? trades.reduce((best, trade) => (trade.realizedPnl > best.realizedPnl ? trade : best))
        : undefined,
    [trades],
  );

  const worstTrade = useMemo(
    () =>
      trades.length > 0
        ? trades.reduce((worst, trade) => (trade.realizedPnl < worst.realizedPnl ? trade : worst))
        : undefined,
    [trades],
  );

  const firstTrade = trades[0];
  const lastTrade = trades[trades.length - 1];

  const isLoading = accountsQuery.isLoading || tradingTradesQuery.isLoading;

  const isError = accountsQuery.isError || tradingTradesQuery.isError || instrumentsQuery.isError;

  return (
    <div className="rmsm-mobile-glass-page w-full min-w-0 space-y-3 overflow-x-hidden pb-8 sm:space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="text-primary h-5 w-5" />
            <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
          </div>

          <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-foreground font-medium">
              {selectedAccount?.name ?? "Trading Account"}
            </span>
            {selectedAccount && (
              <>
                <span>•</span>
                <span>{selectedAccount.type}</span>
                <span>•</span>
                <span>{selectedAccount.currency}</span>
                <span>•</span>
                <span className="text-emerald-500">{selectedAccount.status}</span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="analytics-account" className="text-muted-foreground text-xs font-medium">
            Trading Account
          </label>

          <select
            id="analytics-account"
            value={selectedAccount?.id ?? ""}
            onChange={(event) => setSelectedAccountId(event.target.value)}
            className="bg-background focus:ring-ring h-10 w-full rounded-md border px-3 text-sm outline-none focus:ring-2 sm:h-9 sm:w-auto sm:min-w-44"
            disabled={activeDemoAccounts.length === 0}
          >
            {activeDemoAccounts.length === 0 ? (
              <option value="">No active demo account</option>
            ) : (
              activeDemoAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      {isError && (
        <Alert variant="destructive">
          <AlertDescription>Couldn&apos;t load trading analytics data.</AlertDescription>
        </Alert>
      )}

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-4">
        <Stat
          label="Net P&L"
          value={signedCurrency(performance.realizedPnl)}
          positive={performance.realizedPnl > 0}
          negative={performance.realizedPnl < 0}
        />

        <Stat
          label="Win Rate"
          value={`${performance.winRate.toFixed(1)}%`}
          subtext={`${performance.totalTrades} closed trades`}
        />

        <Stat
          label="Profit Factor"
          value={performance.profitFactor === Infinity ? "∞" : performance.profitFactor.toFixed(2)}
          positive={performance.profitFactor > 1}
          negative={performance.profitFactor >= 0 && performance.profitFactor < 1}
        />

        <Stat
          label="Max Drawdown"
          value={currency(drawdown.maxDrawdown)}
          subtext={`${drawdown.maxDrawdownPct.toFixed(1)}% of peak`}
          negative
        />

        <Stat label="Average Win" value={currency(winLoss.averageWinner)} positive />

        <Stat label="Average Loss" value={currency(winLoss.averageLoser)} negative />

        <Stat
          label="Expectancy"
          value={signedCurrency(
            performance.totalTrades > 0 ? performance.realizedPnl / performance.totalTrades : 0,
          )}
          positive={
            performance.totalTrades > 0 && performance.realizedPnl / performance.totalTrades > 0
          }
          negative={
            performance.totalTrades > 0 && performance.realizedPnl / performance.totalTrades < 0
          }
        />

        <Stat
          label="Total Trades"
          value={String(performance.totalTrades)}
          subtext={`${outcomeStats.find((item) => item.label === "Winning")?.count ?? 0} wins · ${outcomeStats.find((item) => item.label === "Losing")?.count ?? 0} losses`}
        />
      </div>

      {/* Main chart + distribution */}
      <div className="grid gap-3 sm:gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="text-sm font-semibold">Cumulative Realized P&L</CardTitle>
                <CardDescription>Closed-trade performance over time</CardDescription>
              </div>

              <div
                className={[
                  "text-lg font-semibold tabular-nums",
                  performance.realizedPnl >= 0 ? "text-emerald-500" : "text-red-500",
                ].join(" ")}
              >
                {signedCurrency(performance.realizedPnl)}
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[320px] w-full" />
            ) : cumulativePnl.length === 0 ? (
              <EmptyState />
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={cumulativePnl}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value: number) => `$${value.toLocaleString()}`}
                  />
                  <RechartsTooltip
                    formatter={(value: number) => [currency(value), "Realized P&L"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="cumulativePnl"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2.5}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Trade Outcome</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {outcomeStats.map((item) => (
                  <div key={item.label}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span>{item.label}</span>
                      <span className="font-medium tabular-nums">{item.count}</span>
                    </div>

                    <div className="bg-muted h-2 overflow-hidden rounded-full">
                      <div
                        className={[
                          "h-full rounded-full",
                          item.label === "Winning" ? "bg-emerald-500" : "bg-red-500",
                        ].join(" ")}
                        style={{
                          width: `${
                            performance.totalTrades > 0
                              ? (item.count / performance.totalTrades) * 100
                              : 0
                          }%`,
                        }}
                      />
                    </div>

                    <div
                      className={[
                        "mt-1 text-xs tabular-nums",
                        item.pnl >= 0 ? "text-emerald-500" : "text-red-500",
                      ].join(" ")}
                    >
                      {signedCurrency(item.pnl)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Trade Direction</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {directionStats.map((item) => (
                  <div
                    key={item.side}
                    className="flex items-center justify-between rounded-lg border px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      {item.side === "LONG" ? (
                        <TrendingUp className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-500" />
                      )}
                      <span className="text-sm font-medium">{item.side}</span>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-medium tabular-nums">{item.trades} trades</div>
                      <div
                        className={[
                          "text-xs tabular-nums",
                          item.pnl >= 0 ? "text-emerald-500" : "text-red-500",
                        ].join(" ")}
                      >
                        {signedCurrency(item.pnl)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Performance breakdown */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Monthly Performance</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : monthlyPnl.length === 0 ? (
              <EmptyState />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={monthlyPnl}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value: number) => `$${value.toLocaleString()}`}
                  />
                  <RechartsTooltip formatter={(value: number) => [currency(value), "P&L"]} />
                  <Bar dataKey="realizedPnl" radius={[4, 4, 0, 0]}>
                    {monthlyPnl.map((entry) => (
                      <Cell
                        key={entry.month}
                        fill={
                          entry.realizedPnl >= 0 ? "hsl(var(--success))" : "hsl(var(--destructive))"
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Performance by Day</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={weekdayPnl}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="day" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value: number) => `$${value.toLocaleString()}`}
                  />
                  <RechartsTooltip formatter={(value: number) => [currency(value), "P&L"]} />
                  <Bar dataKey="realizedPnl" radius={[4, 4, 0, 0]}>
                    {weekdayPnl.map((entry) => (
                      <Cell
                        key={entry.day}
                        fill={
                          entry.realizedPnl >= 0 ? "hsl(var(--success))" : "hsl(var(--destructive))"
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Stat
          label="Best Trade"
          value={bestTrade ? signedCurrency(bestTrade.realizedPnl) : "—"}
          positive
        />

        <Stat
          label="Worst Trade"
          value={worstTrade ? signedCurrency(worstTrade.realizedPnl) : "—"}
          negative
        />

        <Stat label="Win Streak" value={`${streaks.maxWin}`} subtext="consecutive wins" />

        <Stat label="Loss Streak" value={`${streaks.maxLoss}`} subtext="consecutive losses" />

        <Stat
          label="Avg Duration"
          value={trades.length > 0 ? durationLabel(durationStats.average) : "—"}
        />

        <Stat
          label="Trading Time"
          value={trades.length > 0 ? durationLabel(durationStats.total) : "—"}
        />
      </div>

      {/* Instrument performance */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Instrument Performance</CardTitle>
          <CardDescription>Realized P&L grouped by traded instrument</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : byInstrument.length === 0 ? (
            <EmptyState />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={byInstrument.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="symbolCode" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value: number) => `$${value.toLocaleString()}`}
                />
                <RechartsTooltip formatter={(value: number) => [currency(value), "Realized P&L"]} />
                <Bar dataKey="realizedPnl" radius={[4, 4, 0, 0]}>
                  {byInstrument.slice(0, 10).map((entry) => (
                    <Cell
                      key={entry.symbolCode}
                      fill={
                        entry.realizedPnl >= 0 ? "hsl(var(--success))" : "hsl(var(--destructive))"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Calendar */}
      <Card>
        <CardHeader className="px-3 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center gap-2">
            <CalendarDays className="text-muted-foreground h-4 w-4" />
            <div>
              <CardTitle className="text-sm">Daily P&L</CardTitle>
              <CardDescription>Realized P&L by trading day</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-3 pb-3 sm:px-6 sm:pb-6">
          {isLoading ? (
            <Skeleton className="h-20 w-full sm:h-24" />
          ) : (
            <CalendarHeatmap days={dailyPnl} />
          )}
        </CardContent>
      </Card>

      {/* Trade history */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Trade History</CardTitle>
          <CardDescription>
            Closed trades for the selected trading account
            {firstTrade && lastTrade
              ? ` · ${new Date(firstTrade.closedAt).toLocaleDateString()} – ${new Date(lastTrade.closedAt).toLocaleDateString()}`
              : ""}
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6">
              <Skeleton className="h-40 w-full" />
            </div>
          ) : trades.length === 0 ? (
            <EmptyState text="No closed trades for this account." />
          ) : (
            <>
              <div className="block sm:hidden">
                <div className="divide-y">
                  {[...trades].reverse().map((trade) => {
                    const duration =
                      (new Date(trade.closedAt).getTime() - new Date(trade.openedAt).getTime()) /
                      60000;

                    const positive = trade.realizedPnl > 0;
                    const negative = trade.realizedPnl < 0;

                    return (
                      <div
                        key={trade.id}
                        className="active:bg-muted/30 px-3 py-3 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold">{trade.symbolCode}</div>
                            <div className="text-muted-foreground mt-0.5 text-[10px]">
                              {trade.side} · {trade.quantityUnits}
                            </div>
                          </div>

                          <div
                            className={[
                              "shrink-0 text-sm font-semibold tabular-nums",
                              positive ? "text-emerald-500" : "",
                              negative ? "text-red-500" : "",
                            ].join(" ")}
                          >
                            {signedCurrency(trade.realizedPnl)}
                          </div>
                        </div>

                        <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[10px]">
                          <div className="flex justify-between gap-2">
                            <span className="text-muted-foreground">Entry</span>
                            <span className="tabular-nums">
                              {trade.entryPrice.toLocaleString()}
                            </span>
                          </div>

                          <div className="flex justify-between gap-2">
                            <span className="text-muted-foreground">Exit</span>
                            <span className="tabular-nums">{trade.exitPrice.toLocaleString()}</span>
                          </div>

                          <div className="flex justify-between gap-2">
                            <span className="text-muted-foreground">Open Time</span>
                            <span className="truncate tabular-nums">
                              {new Date(trade.openedAt).toLocaleString()}
                            </span>
                          </div>

                          <div className="flex justify-between gap-2">
                            <span className="text-muted-foreground">Closed</span>
                            <span className="truncate tabular-nums">
                              {new Date(trade.closedAt).toLocaleString()}
                            </span>
                          </div>

                          <div className="flex justify-between gap-2">
                            <span className="text-muted-foreground">Duration</span>
                            <span className="tabular-nums">{durationLabel(duration)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="hidden overflow-x-auto sm:block">
                <table className="w-full min-w-[900px] text-sm">
                  <thead className="bg-muted/30 border-y">
                    <tr className="text-muted-foreground text-left text-xs uppercase tracking-wide">
                      <th className="px-4 py-3 font-medium">Open Time</th>
                      <th className="px-4 py-3 font-medium">Instrument</th>
                      <th className="px-4 py-3 font-medium">Side</th>
                      <th className="px-4 py-3 text-right font-medium">Qty</th>
                      <th className="px-4 py-3 text-right font-medium">Entry</th>
                      <th className="px-4 py-3 text-right font-medium">Exit</th>
                      <th className="px-4 py-3 text-right font-medium">P&L</th>
                      <th className="px-4 py-3 font-medium">Closed</th>
                      <th className="px-4 py-3 text-right font-medium">Duration</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y">
                    {[...trades].reverse().map((trade) => {
                      const duration =
                        (new Date(trade.closedAt).getTime() - new Date(trade.openedAt).getTime()) /
                        60000;

                      return (
                        <tr key={trade.id} className="hover:bg-muted/30 transition-colors">
                          <td className="text-muted-foreground whitespace-nowrap px-4 py-3">
                            {new Date(trade.openedAt).toLocaleString()}
                          </td>

                          <td className="px-4 py-3 font-medium">{trade.symbolCode}</td>

                          <td className="px-4 py-3">
                            <span
                              className={[
                                "font-medium",
                                trade.side === "LONG" ? "text-emerald-500" : "text-red-500",
                              ].join(" ")}
                            >
                              {trade.side}
                            </span>
                          </td>

                          <td className="px-4 py-3 text-right tabular-nums">
                            {trade.quantityUnits.toLocaleString()}
                          </td>

                          <td className="px-4 py-3 text-right tabular-nums">
                            {trade.entryPrice.toLocaleString()}
                          </td>

                          <td className="px-4 py-3 text-right tabular-nums">
                            {trade.exitPrice.toLocaleString()}
                          </td>

                          <td
                            className={[
                              "px-4 py-3 text-right font-medium tabular-nums",
                              trade.realizedPnl >= 0 ? "text-emerald-500" : "text-red-500",
                            ].join(" ")}
                          >
                            {signedCurrency(trade.realizedPnl)}
                          </td>

                          <td className="text-muted-foreground whitespace-nowrap px-4 py-3">
                            {new Date(trade.closedAt).toLocaleString()}
                          </td>

                          <td className="text-muted-foreground px-4 py-3 text-right tabular-nums">
                            {durationLabel(duration)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Data note */}
      <Alert>
        <AlertDescription className="text-xs">
          Analytics are calculated from closed realized trades for the selected account. The main
          chart is cumulative realized P&L, not a true historical mark-to-market equity curve.
        </AlertDescription>
      </Alert>
    </div>
  );
}
