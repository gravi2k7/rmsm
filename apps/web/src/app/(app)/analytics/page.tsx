"use client";

import { useMemo } from "react";
import { BarChart3, TrendingDown, Percent, Target } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from "recharts";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Alert, AlertDescription, Skeleton } from "@rmsm/ui";
import { useTrades } from "@/features/portfolio/hooks/use-portfolio";
import {
  computePerformanceMetrics,
  computeCumulativePnl,
  computeDrawdown,
  computeWinLossAverages,
  computePerformanceByInstrument,
  computePerformanceByHoldingDuration,
  computeDailyPnlCalendar,
} from "@/features/portfolio/lib/performance";
import { StatCard } from "@/features/dashboard/components/widget-card";

function currency(value: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

function CalendarHeatmap({ days }: { days: { date: string; realizedPnl: number; tradeCount: number }[] }) {
  if (days.length === 0) return <p className="text-sm text-muted-foreground">No closed trades yet.</p>;

  const maxAbs = Math.max(1, ...days.map((d) => Math.abs(d.realizedPnl)));

  return (
    <div className="flex flex-wrap gap-1">
      {days.map((day) => {
        const intensity = Math.min(1, Math.abs(day.realizedPnl) / maxAbs);
        const isPositive = day.realizedPnl >= 0;
        return (
          <div
            key={day.date}
            title={`${day.date}: ${currency(day.realizedPnl)} (${day.tradeCount} trade${day.tradeCount === 1 ? "" : "s"})`}
            className="flex h-8 w-8 items-center justify-center rounded text-[10px] font-medium text-white"
            style={{
              backgroundColor: day.realizedPnl === 0 ? "hsl(var(--muted))" : isPositive ? `rgba(34,197,94,${0.25 + intensity * 0.6})` : `rgba(239,68,68,${0.25 + intensity * 0.6})`,
              color: day.realizedPnl === 0 ? "hsl(var(--muted-foreground))" : undefined,
            }}
          >
            {day.date.slice(8, 10)}
          </div>
        );
      })}
    </div>
  );
}

export default function AnalyticsCenterPage() {
  const tradesQuery = useTrades();
  const trades = useMemo(() => tradesQuery.data?.items ?? [], [tradesQuery.data]);

  const performance = useMemo(() => computePerformanceMetrics(trades), [trades]);
  const cumulativePnl = useMemo(() => computeCumulativePnl(trades), [trades]);
  const drawdown = useMemo(() => computeDrawdown(trades), [trades]);
  const winLoss = useMemo(() => computeWinLossAverages(trades), [trades]);
  const byInstrument = useMemo(() => computePerformanceByInstrument(trades), [trades]);
  const byDuration = useMemo(() => computePerformanceByHoldingDuration(trades), [trades]);
  const calendar = useMemo(() => computeDailyPnlCalendar(trades), [trades]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Analytics Center</h1>
        <p className="text-sm text-muted-foreground">Trading performance computed from your real trade history.</p>
      </div>

      {tradesQuery.isError && (
        <Alert variant="destructive">
          <AlertDescription>Couldn&apos;t load trade history.</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Win Rate" icon={<Percent className="h-4 w-4 text-muted-foreground" />} value={`${performance.winRate.toFixed(1)}%`} subtext={`${performance.totalTrades} trades`} isLoading={tradesQuery.isLoading} isError={tradesQuery.isError} />
        <StatCard title="Profit Factor" icon={<BarChart3 className="h-4 w-4 text-muted-foreground" />} value={performance.profitFactor === Infinity ? "∞" : performance.profitFactor.toFixed(2)} isLoading={tradesQuery.isLoading} isError={tradesQuery.isError} />
        <StatCard title="Max Drawdown" icon={<TrendingDown className="h-4 w-4 text-destructive" />} value={currency(drawdown.maxDrawdown)} subtext={`${drawdown.maxDrawdownPct.toFixed(1)}% of peak`} valueClassName="text-destructive" isLoading={tradesQuery.isLoading} isError={tradesQuery.isError} />
        <StatCard title="Risk / Reward" icon={<Target className="h-4 w-4 text-muted-foreground" />} value={winLoss.riskRewardRatio.toFixed(2)} subtext={`avg win ${currency(winLoss.averageWinner)} / avg loss ${currency(winLoss.averageLoser)}`} isLoading={tradesQuery.isLoading} isError={tradesQuery.isError} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Cumulative Realized P&amp;L</CardTitle>
          <CardDescription>
            Not a true equity curve (that would require historical prices this console has no source for) — cumulative sum of realized P&amp;L
            per closed trade, in order.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tradesQuery.isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : cumulativePnl.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">No closed trades yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={cumulativePnl}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" fontSize={12} tickLine={false} />
                <YAxis fontSize={12} tickLine={false} tickFormatter={(v: number) => `$${v.toLocaleString()}`} />
                <RechartsTooltip formatter={(value: number) => [currency(value), "Cumulative P&L"]} />
                <Line type="monotone" dataKey="cumulativePnl" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Performance by Instrument</CardTitle>
          </CardHeader>
          <CardContent>
            {tradesQuery.isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : byInstrument.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No closed trades yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={byInstrument.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="symbolCode" fontSize={12} tickLine={false} />
                  <YAxis fontSize={12} tickLine={false} tickFormatter={(v: number) => `$${v.toLocaleString()}`} />
                  <RechartsTooltip formatter={(value: number) => [currency(value), "Realized P&L"]} />
                  <Bar dataKey="realizedPnl" radius={[4, 4, 0, 0]}>
                    {byInstrument.slice(0, 10).map((entry, i) => (
                      <Cell key={i} fill={entry.realizedPnl >= 0 ? "hsl(var(--success))" : "hsl(var(--destructive))"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Performance by Holding Duration</CardTitle>
            <CardDescription>
              &quot;Performance by timeframe&quot; is bucketed by how long each trade was held — trades don&apos;t carry a timeframe field
              themselves (that&apos;s a chart-display concept, not recorded per-trade).
            </CardDescription>
          </CardHeader>
          <CardContent>
            {tradesQuery.isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : byDuration.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No closed trades yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={byDuration}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="label" fontSize={11} tickLine={false} />
                  <YAxis fontSize={12} tickLine={false} tickFormatter={(v: number) => `$${v.toLocaleString()}`} />
                  <RechartsTooltip formatter={(value: number) => [currency(value), "Realized P&L"]} />
                  <Bar dataKey="realizedPnl" radius={[4, 4, 0, 0]}>
                    {byDuration.map((entry, i) => (
                      <Cell key={i} fill={entry.realizedPnl >= 0 ? "hsl(var(--success))" : "hsl(var(--destructive))"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Performance Calendar</CardTitle>
          <CardDescription>Darker green = larger realized gain that day, darker red = larger realized loss. Hover a cell for details.</CardDescription>
        </CardHeader>
        <CardContent>{tradesQuery.isLoading ? <Skeleton className="h-24 w-full" /> : <CalendarHeatmap days={calendar} />}</CardContent>
      </Card>

      <Alert>
        <AlertDescription>
          &quot;Performance by Strategy&quot; isn&apos;t shown here: <code className="text-xs">Trade</code> has no strategy id field, and (as
          documented on the Strategy Center) there&apos;s no cross-reference between the Strategy Builder and the trading pipeline in this API. A
          real, verified gap, not an omitted feature.
        </AlertDescription>
      </Alert>
    </div>
  );
}
