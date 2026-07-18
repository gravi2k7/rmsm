/** Every candle interval this domain supports, matching the platform's
 * own required timeframe list exactly. `TICK` represents a non-aggregated,
 * per-tick "timeframe" (a 1-tick "candle") rather than a time interval. */
export enum Timeframe {
  TICK = "TICK",
  S1 = "1s",
  S5 = "5s",
  S15 = "15s",
  S30 = "30s",
  M1 = "1m",
  M2 = "2m",
  M3 = "3m",
  M5 = "5m",
  M10 = "10m",
  M15 = "15m",
  M30 = "30m",
  M45 = "45m",
  H1 = "1h",
  H2 = "2h",
  H4 = "4h",
  H6 = "6h",
  H8 = "8h",
  H12 = "12h",
  D1 = "1D",
  W1 = "1W",
  MN1 = "1M",
}

/** Duration in seconds for every timeframe that represents a fixed time
 * interval. `TICK` has no fixed duration (a tick-timeframe "candle" is
 * exactly one tick, regardless of how much wall-clock time it spans) and
 * `MN1` (calendar month) has no *fixed* duration either — both are
 * `undefined` here rather than an approximated/wrong number, since
 * silently returning e.g. 2,592,000 for "1 month" would be wrong for
 * every month that isn't exactly 30 days. */
export const TIMEFRAME_DURATION_SECONDS: Readonly<Record<Timeframe, number | undefined>> = {
  [Timeframe.TICK]: undefined,
  [Timeframe.S1]: 1,
  [Timeframe.S5]: 5,
  [Timeframe.S15]: 15,
  [Timeframe.S30]: 30,
  [Timeframe.M1]: 60,
  [Timeframe.M2]: 120,
  [Timeframe.M3]: 180,
  [Timeframe.M5]: 300,
  [Timeframe.M10]: 600,
  [Timeframe.M15]: 900,
  [Timeframe.M30]: 1800,
  [Timeframe.M45]: 2700,
  [Timeframe.H1]: 3600,
  [Timeframe.H2]: 7200,
  [Timeframe.H4]: 14400,
  [Timeframe.H6]: 21600,
  [Timeframe.H8]: 28800,
  [Timeframe.H12]: 43200,
  [Timeframe.D1]: 86400,
  [Timeframe.W1]: 604800,
  [Timeframe.MN1]: undefined,
};
