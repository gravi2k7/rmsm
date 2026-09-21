"use client";

import { useEffect, useRef, useState } from "react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
} from "@rmsm/ui";
import {
  BarChart3,
  Play,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useRunStrategyVersionBacktest } from "@/hooks/use-strategy-versions";
import {
  useCandles,
  useInstrument,
  useInstruments,
} from "@/features/market/hooks/use-market-data";
import type { BacktestResult } from "@/lib/api-client";
import type { CandleInterval } from "@/features/market/types";
import { RMSMCandlestickChart } from "@/features/market/components/rmsm-candlestick-chart";
import {
  createBacktestReplayController,
  type BacktestReplayController,
} from "@/features/market/backtest/backtest-replay";
import { BacktestReplayToolbar } from "@/features/market/backtest/backtest-replay-toolbar";

const TIMEFRAMES = [
  ["ONE_MINUTE", "1 Minute"],
  ["FIVE_MINUTES", "5 Minutes"],
  ["FIFTEEN_MINUTES", "15 Minutes"],
  ["THIRTY_MINUTES", "30 Minutes"],
  ["ONE_HOUR", "1 Hour"],
  ["FOUR_HOURS", "4 Hours"],
  ["ONE_DAY", "1 Day"],
] as const;

function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function dateValue(date: Date) {
  return date.toISOString().slice(0, 16);
}

type BacktestChartMarker = {
  time: string;
  price: number;
  side: "LONG" | "SHORT";
  event: "ENTRY" | "EXIT";
  label?: string;
};

export function StrategyVersionBacktest({
  versionId,
  defaultInstrumentId,
  defaultHtf,
  defaultLtf,
  runtime,
}: {
  versionId: string;
  defaultInstrumentId: string;
  defaultHtf?: string;
  defaultLtf?: string;
  runtime?: string;
}) {
  const [instrumentId, setInstrumentId] =
    useState(defaultInstrumentId);
  const [instrumentSearch, setInstrumentSearch] =
    useState("");
  const [interval, setInterval] =
    useState(defaultLtf || "FIVE_MINUTES");

  const [htf, setHtf] =
    useState(defaultHtf || "ONE_HOUR");
  const [ltf, setLtf] =
    useState(defaultLtf || "FIVE_MINUTES");

  const [from, setFrom] = useState(
    dateValue(new Date(Date.now() - 30 * 86400000)),
  );
  const [to, setTo] = useState(dateValue(new Date()));
  const [startingBalance, setStartingBalance] =
    useState("10000");
  const [candleLimit, setCandleLimit] =
    useState("5000");

  const [result, setResult] =
    useState<BacktestResult | null>(null);

  const [replayInput, setReplayInput] = useState<{
    instrumentId: string;
    interval: string;
    from: string;
    to: string;
    candleLimit: number;
  } | null>(null);

  const [replayState, setReplayState] = useState({
    cursor: 0,
    playing: false,
    speed: 1,
  });

  const replayControllerRef =
    useRef<BacktestReplayController | null>(null);

  const mutation =
    useRunStrategyVersionBacktest();

  const isRdseV2 = runtime === "RDSE_V2";

  const backtestMarkers: BacktestChartMarker[] =
    result?.trades.flatMap((trade) => [
      {
        time: trade.openedAt,
        price: trade.entryPrice,
        side: trade.side,
        event: "ENTRY",
        label: `ENTRY ${trade.side}`,
      },
      {
        time: trade.closedAt,
        price: trade.exitPrice,
        side: trade.side,
        event: "EXIT",
        label: `EXIT ${trade.side}`,
      },
    ]) ?? [];

  const instruments = useInstruments({
    query: instrumentSearch || undefined,
    status: "ACTIVE",
    page: 1,
    pageSize: 50,
  });

  const selectedInstrument =
    useInstrument(instrumentId);

  const candlesQuery = useCandles(
    replayInput
      ? {
          instrumentId: replayInput.instrumentId,
          interval: replayInput.interval as CandleInterval,
          from: replayInput.from,
          to: replayInput.to,
          limit: replayInput.candleLimit,
        }
      : null,
  );

  useEffect(() => {
    const controller = createBacktestReplayController(
      candlesQuery.data?.length ?? 0,
    );

    replayControllerRef.current = controller;
    setReplayState(controller.getState());

    const unsubscribe = controller.subscribe(() => {
      setReplayState(controller.getState());
    });

    return () => {
      unsubscribe();
      controller.destroy();

      if (replayControllerRef.current === controller) {
        replayControllerRef.current = null;
      }
    };
  }, [candlesQuery.data]);

  useEffect(() => {
    if (!result) {
      return;
    }

    replayControllerRef.current?.reset();
  }, [result]);

  useEffect(() => {
    setInstrumentId(defaultInstrumentId);
  }, [defaultInstrumentId]);

  const options = [
    ...(selectedInstrument.data &&
    !instruments.data?.data.some(
      (x) => x.id === selectedInstrument.data?.id,
    )
      ? [selectedInstrument.data]
      : []),
    ...(instruments.data?.data ?? []),
  ];

  const run = () => {
    setResult(null);
    setReplayInput(null);

    const input = {
      instrumentId,
      interval,
      from: new Date(from).toISOString(),
      to: new Date(to).toISOString(),
      startingBalance: Number(startingBalance),
      ...(isRdseV2
        ? {
            htf,
            ltf,
          }
        : {}),
      candleLimit: Number(candleLimit),
    };

    mutation.mutate(
      {
        versionId,
        input,
      },
      {
        onSuccess: (backtestResult) => {
          setResult(backtestResult);

          setReplayInput({
            instrumentId: input.instrumentId,
            interval: isRdseV2 ? ltf : input.interval,
            from: input.from,
            to: input.to,
            candleLimit: input.candleLimit,
          });
        },
      },
    );
  };

  const metrics = result?.metrics;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <BarChart3 className="h-4 w-4" />
            Backtest
          </CardTitle>

          {runtime && (
            <span className="text-xs text-muted-foreground">
              Runtime: {runtime}
            </span>
          )}

          {result && (
            <span className="text-xs text-muted-foreground">
              {result.trades.length} completed trades
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1 lg:col-span-2">
            <label
              htmlFor="backtest-instrument-search"
              className="text-xs text-muted-foreground"
            >
              Instrument
            </label>

            <Input
              id="backtest-instrument-search"
              value={instrumentSearch}
              onChange={(e) =>
                setInstrumentSearch(e.target.value)
              }
              placeholder="Search symbol or name..."
            />

            <select
              className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm"
              value={instrumentId}
              onChange={(e) =>
                setInstrumentId(e.target.value)
              }
              aria-label="Backtest instrument"
            >
              <option value="">Select instrument</option>

              {options.map((instrument) => (
                <option
                  key={instrument.id}
                  value={instrument.id}
                >
                  {instrument.symbol} — {instrument.name}
                </option>
              ))}
            </select>
          </div>

          {!isRdseV2 && (
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">
                Timeframe
              </label>

              <select
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                value={interval}
                onChange={(e) =>
                  setInterval(e.target.value)
                }
                aria-label="Backtest timeframe"
              >
                {TIMEFRAMES.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-1">
            <label
              htmlFor="backtest-balance"
              className="text-xs text-muted-foreground"
            >
              Starting Balance
            </label>

            <Input
              id="backtest-balance"
              type="number"
              min="0"
              step="any"
              value={startingBalance}
              onChange={(e) =>
                setStartingBalance(e.target.value)
              }
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="backtest-from"
              className="text-xs text-muted-foreground"
            >
              From
            </label>

            <Input
              id="backtest-from"
              type="datetime-local"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="backtest-to"
              className="text-xs text-muted-foreground"
            >
              To
            </label>

            <Input
              id="backtest-to"
              type="datetime-local"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>

          {isRdseV2 && (
            <>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">
                  HTF
                </label>

                <select
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  value={htf}
                  onChange={(e) => setHtf(e.target.value)}
                  aria-label="Backtest higher timeframe"
                >
                  {TIMEFRAMES.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">
                  LTF
                </label>

                <select
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  value={ltf}
                  onChange={(e) => {
                    const value = e.target.value;
                    setLtf(value);
                    setInterval(value);
                  }}
                  aria-label="Backtest lower timeframe"
                >
                  {TIMEFRAMES.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          <div className="space-y-1">
            <label
              htmlFor="backtest-limit"
              className="text-xs text-muted-foreground"
            >
              Candle Limit
            </label>

            <Input
              id="backtest-limit"
              type="number"
              min="1"
              max="5000"
              step="1"
              value={candleLimit}
              onChange={(e) =>
                setCandleLimit(e.target.value)
              }
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            loading={mutation.isPending}
            disabled={!instrumentId}
            onClick={run}
          >
            <Play className="h-4 w-4" />
            Run Backtest
          </Button>

          {mutation.isError && (
            <span className="text-sm text-destructive">
              {mutation.error instanceof Error
                ? mutation.error.message
                : "Backtest failed."}
            </span>
          )}
        </div>

        {metrics && (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Metric
                label="Net Profit"
                value={money(metrics.netProfit)}
                positive={metrics.netProfit >= 0}
              />

              <Metric
                label="Ending Balance"
                value={money(metrics.endingBalance)}
              />

              <Metric
                label="Win Rate"
                value={`${metrics.winRate.toFixed(1)}%`}
              />

              <Metric
                label="Max Drawdown"
                value={`${money(metrics.maxDrawdown)} (${metrics.maxDrawdownPercent.toFixed(1)}%)`}
                negative
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Metric
                label="Total Trades"
                value={String(metrics.totalTrades)}
              />

              <Metric
                label="Winning Trades"
                value={String(metrics.winningTrades)}
                positive
              />

              <Metric
                label="Losing Trades"
                value={String(metrics.losingTrades)}
                negative
              />

              <Metric
                label="Gross P&L"
                value={money(
                  metrics.grossProfit +
                    metrics.grossLoss,
                )}
              />
            </div>

            {candlesQuery.data && candlesQuery.data.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <BarChart3 className="h-4 w-4" />
                  Price Replay
                </div>

                <div className="overflow-hidden rounded-md border">
                  <div className="h-[520px] w-full">
                    <RMSMCandlestickChart
                      candles={candlesQuery.data}
                      replayCursor={replayState.cursor}
                      replayEnabled
                      backtestMarkers={backtestMarkers}
                    />
                  </div>

                  <div className="border-t bg-background px-3 py-2">
                    <BacktestReplayToolbar
                      state={replayState}
                      candleCount={candlesQuery.data.length}
                      onReset={() =>
                        replayControllerRef.current?.reset()
                      }
                      onStepBackward={() =>
                        replayControllerRef.current?.stepBackward()
                      }
                      onToggle={() =>
                        replayControllerRef.current?.toggle()
                      }
                      onStepForward={() =>
                        replayControllerRef.current?.stepForward()
                      }
                      onSpeedChange={(speed) =>
                        replayControllerRef.current?.setSpeed(speed)
                      }
                    />
                  </div>
                </div>
              </div>
            )}

            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                <TrendingUp className="h-4 w-4" />
                Equity Curve
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={result?.equityCurve ?? []}
                  >
                    <XAxis
                      dataKey="time"
                      tickFormatter={(value) =>
                        new Date(
                          value,
                        ).toLocaleDateString()
                      }
                    />
                    <YAxis />
                    <Tooltip
                      formatter={(value: number) =>
                        money(value)
                      }
                    />
                    <Line
                      type="monotone"
                      dataKey="equity"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr className="text-left">
                    <th className="px-3 py-2">Side</th>
                    <th className="px-3 py-2">Qty</th>
                    <th className="px-3 py-2">Entry</th>
                    <th className="px-3 py-2">Exit</th>
                    <th className="px-3 py-2">P&L</th>
                    <th className="px-3 py-2">Opened</th>
                    <th className="px-3 py-2">Closed</th>
                  </tr>
                </thead>

                <tbody>
                  {result?.trades.map((trade) => (
                    <tr
                      key={trade.id}
                      className="border-t"
                    >
                      <td className="px-3 py-2">
                        {trade.side}
                      </td>
                      <td className="px-3 py-2">
                        {trade.quantity}
                      </td>
                      <td className="px-3 py-2">
                        {trade.entryPrice}
                      </td>
                      <td className="px-3 py-2">
                        {trade.exitPrice}
                      </td>
                      <td
                        className={`px-3 py-2 font-medium ${
                          trade.realizedPnl >= 0
                            ? "text-success"
                            : "text-destructive"
                        }`}
                      >
                        {money(trade.realizedPnl)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2">
                        {new Date(
                          trade.openedAt,
                        ).toLocaleString()}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2">
                        {new Date(
                          trade.closedAt,
                        ).toLocaleString()}
                      </td>
                    </tr>
                  ))}

                  {result?.trades.length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-3 py-8 text-center text-muted-foreground"
                      >
                        No completed trades in this period.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Metric({
  label,
  value,
  positive,
  negative,
}: {
  label: string;
  value: string;
  positive?: boolean;
  negative?: boolean;
}) {
  return (
    <div className="rounded-md border p-3">
      <div className="text-xs text-muted-foreground">
        {label}
      </div>

      <div
        className={`mt-1 flex items-center gap-1 text-lg font-semibold ${
          positive
            ? "text-success"
            : negative
              ? "text-destructive"
              : ""
        }`}
      >
        {positive && (
          <TrendingUp className="h-4 w-4" />
        )}

        {negative && (
          <TrendingDown className="h-4 w-4" />
        )}

        {value}
      </div>
    </div>
  );
}
