import { Injectable } from "@nestjs/common";
import { CandleInterval } from "@rmsm/database";
import type { MarketCandleModel } from "../interfaces/models/time-series.models";
import { candleIntervalToMs } from "../constants/candle-interval.constants";

const DERIVED_INTERVALS = new Set<CandleInterval>([
  CandleInterval.FIVE_MINUTES,
  CandleInterval.FIFTEEN_MINUTES,
  CandleInterval.THIRTY_MINUTES,
  CandleInterval.ONE_HOUR,
  CandleInterval.FOUR_HOURS,
]);

export interface AggregatedCandle {
  interval: CandleInterval;
  eventTime: Date;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  providerId: string;
  sourceTimestamp: Date | undefined;
}

@Injectable()
export class CandleAggregationService {
  /**
   * Rebuilds one higher timeframe candle from its complete set of 1-minute
   * canonical candles.
   *
   * This deliberately rejects incomplete source coverage rather than
   * manufacturing a partial candle.
   */
  aggregateFromOneMinute(
    candles: MarketCandleModel[],
    interval: CandleInterval,
    eventTime: Date,
  ): AggregatedCandle | null {
    if (!DERIVED_INTERVALS.has(interval)) {
      return null;
    }

    const intervalMs = candleIntervalToMs(interval);
    if (!Number.isFinite(intervalMs) || intervalMs <= 60_000) {
      return null;
    }

    const expectedCount = intervalMs / 60_000;

    const expectedStart = eventTime.getTime();

    const ordered = [...candles]
      .filter((candle) => candle.interval === CandleInterval.ONE_MINUTE)
      .sort((a, b) => a.eventTime.getTime() - b.eventTime.getTime());

    if (ordered.length !== expectedCount) {
      return null;
    }

    for (let index = 0; index < expectedCount; index += 1) {
      const expectedTime = expectedStart + index * 60_000;
      if (ordered[index]!.eventTime.getTime() !== expectedTime) {
        return null;
      }
    }

    const providerIds = new Set(ordered.map((candle) => candle.providerId));
    if (providerIds.size !== 1) {
      return null;
    }

    const first = ordered[0]!;
    const last = ordered[ordered.length - 1]!;

    let high = first.high;
    let low = first.low;

    for (const candle of ordered) {
      if (this.compareDecimal(candle.high, high) > 0) {
        high = candle.high;
      }

      if (this.compareDecimal(candle.low, low) < 0) {
        low = candle.low;
      }
    }

    const volume = ordered
      .map((candle) => candle.volume)
      .reduce((sum, value) => this.addDecimal(sum, value), "0");

    const sourceTimestampValues = ordered
      .map((candle) => candle.sourceTimestamp?.getTime())
      .filter((value): value is number => value !== undefined);

    return {
      interval,
      eventTime,
      open: first.open,
      high,
      low,
      close: last.close,
      volume,
      providerId: first.providerId,
      sourceTimestamp:
        sourceTimestampValues.length > 0
          ? new Date(Math.max(...sourceTimestampValues))
          : undefined,
    };
  }

  private compareDecimal(left: string, right: string): number {
    const leftParts = left.split(".");
    const rightParts = right.split(".");

    const leftInt = leftParts[0] ?? "0";
    const leftFrac = leftParts[1] ?? "";
    const rightInt = rightParts[0] ?? "0";
    const rightFrac = rightParts[1] ?? "";

    const leftNegative = leftInt.startsWith("-");
    const rightNegative = rightInt.startsWith("-");

    if (leftNegative !== rightNegative) {
      return leftNegative ? -1 : 1;
    }

    const normalize = (value: string) =>
      value.replace("-", "").replace(/^0+(?=\d)/, "");

    const li = normalize(leftInt);
    const ri = normalize(rightInt);

    if (li.length !== ri.length) {
      const result = li.length > ri.length ? 1 : -1;
      return leftNegative ? -result : result;
    }

    if (li !== ri) {
      const result = li > ri ? 1 : -1;
      return leftNegative ? -result : result;
    }

    const length = Math.max(leftFrac.length, rightFrac.length);

    const lf = leftFrac.padEnd(length, "0");
    const rf = rightFrac.padEnd(length, "0");

    if (lf === rf) {
      return 0;
    }

    const result = lf > rf ? 1 : -1;
    return leftNegative ? -result : result;
  }

  private addDecimal(left: string, right: string): string {
    const leftParts = left.split(".");
    const rightParts = right.split(".");

    const leftInt = leftParts[0] ?? "0";
    const leftFrac = leftParts[1] ?? "";
    const rightInt = rightParts[0] ?? "0";
    const rightFrac = rightParts[1] ?? "";

    const scale = Math.max(leftFrac.length, rightFrac.length);

    const leftDigits = `${leftInt.replace("-", "")}${leftFrac.padEnd(scale, "0")}`;
    const rightDigits = `${rightInt.replace("-", "")}${rightFrac.padEnd(scale, "0")}`;

    const leftNegative = left.startsWith("-");
    const rightNegative = right.startsWith("-");

    const leftValue = BigInt(leftDigits || "0") * BigInt(leftNegative ? -1 : 1);
    const rightValue =
      BigInt(rightDigits || "0") * BigInt(rightNegative ? -1 : 1);

    const result = leftValue + rightValue;
    const negative = result < 0n;
    const absolute = (negative ? -result : result).toString();

    if (scale === 0) {
      return `${negative ? "-" : ""}${absolute}`;
    }

    const padded = absolute.padStart(scale + 1, "0");
    const integerPart = padded.slice(0, -scale);
    const fractionalPart = padded.slice(-scale).replace(/0+$/, "");

    return `${negative ? "-" : ""}${integerPart}${
      fractionalPart ? `.${fractionalPart}` : ""
    }`;
  }
}
