import type { CandleInterval } from "@rmsm/database";

import type {
  HistoricalDataClient,
  HistoricalDataRequest,
  HistoricalDataResponse,
} from "../../../interfaces/historical-data-client.interface";
import type { NormalizedCandle } from "../../../interfaces/normalized-market-data.interface";

import { InstrumentAliasRepository } from "../../../repositories/instrument-alias.repository";
import {
  CTRADER_TRENDBAR_PERIOD,
  type CTraderOpenApiTrendbar,
} from "./ctrader-openapi.types";
import { CTraderOpenApiClient } from "./ctrader-openapi.client";

const PRICE_SCALE = 100_000;

function number(value: string | number | undefined, field: string): number {
  if (value === undefined) {
    throw new Error(`cTrader historical trendbar missing ${field}.`);
  }

  const result = Number(value);

  if (!Number.isFinite(result)) {
    throw new Error(`Invalid cTrader historical ${field}: ${String(value)}`);
  }

  return result;
}

function price(value: number): string {
  return (value / PRICE_SCALE).toFixed(10).replace(/\.?0+$/, "");
}

function mapTrendbar(
  bar: CTraderOpenApiTrendbar,
  providerSymbol: string,
  interval: CandleInterval,
): NormalizedCandle {
  const lowRaw = number(bar.low, "low");
  const openDelta = number(bar.deltaOpen, "deltaOpen");
  const closeDelta = number(bar.deltaClose, "deltaClose");
  const highDelta = number(bar.deltaHigh, "deltaHigh");
  const timestampMinutes = number(
    bar.utcTimestampInMinutes,
    "utcTimestampInMinutes",
  );

  const open = lowRaw + openDelta;
  const close = lowRaw + closeDelta;
  const high = lowRaw + highDelta;

  return {
    providerSymbol,
    interval,
    eventTime: new Date(timestampMinutes * 60_000),
    open: price(open),
    high: price(high),
    low: price(lowRaw),
    close: price(close),
    volume: String(number(bar.volume, "volume")),
  };
}

export class CTraderOpenApiHistoricalClient
  implements HistoricalDataClient
{
  constructor(
    private readonly client: CTraderOpenApiClient,
    private readonly aliasRepository: InstrumentAliasRepository,
    private readonly providerId: string,
    private readonly accountId: number,
  ) {}

  async fetchCandles(
    request: HistoricalDataRequest,
  ): Promise<HistoricalDataResponse> {
    const period = CTRADER_TRENDBAR_PERIOD[request.interval];

    if (period === undefined) {
      throw new Error(
        `cTrader Open API does not support interval ${request.interval}.`,
      );
    }

    const alias = await this.aliasRepository.findByProviderSymbol(
      this.providerId,
      request.providerSymbol,
    );

    if (!alias?.providerInstrumentId) {
      throw new Error(
        `cTrader provider instrument id is missing for ${request.providerSymbol}.`,
      );
    }

    const symbolId = Number(alias.providerInstrumentId);

    if (!Number.isSafeInteger(symbolId) || symbolId <= 0) {
      throw new Error(
        `Invalid cTrader provider instrument id for ${request.providerSymbol}: ${alias.providerInstrumentId}`,
      );
    }

    const candles: NormalizedCandle[] = [];
    let fromTimestamp = request.from.getTime();
    const toTimestamp = request.to.getTime();

    const periodMinutes = period === 1
      ? 1
      : period === 5
        ? 5
        : period === 7
          ? 15
          : period === 8
            ? 30
            : period === 9
              ? 60
              : period === 10
                ? 240
                : period === 12
                  ? 1440
                  : period === 13
                    ? 10080
                    : 43200;

    for (let page = 0; page < 1000 && fromTimestamp < toTimestamp; page += 1) {
      const response = await this.client.requestTrendbars({
        accountId: this.accountId,
        symbolId,
        period,
        fromTimestamp,
        toTimestamp,
      });

      const trendbars = response.trendbar ?? [];

      if (trendbars.length === 0) {
        break;
      }

      candles.push(
        ...trendbars.map((bar) =>
          mapTrendbar(
            bar as CTraderOpenApiTrendbar,
            request.providerSymbol,
            request.interval,
          ),
        ),
      );

      if (!response.hasMore) {
        break;
      }

      const lastTimestampMinutes = number(
        trendbars[trendbars.length - 1]?.utcTimestampInMinutes,
        "utcTimestampInMinutes",
      );

      const nextFromTimestamp =
        (lastTimestampMinutes + periodMinutes) * 60_000;

      if (nextFromTimestamp <= fromTimestamp) {
        throw new Error(
          `cTrader historical pagination did not advance for ${request.providerSymbol}.`,
        );
      }

      fromTimestamp = nextFromTimestamp;
    }

    return {
      candles,
    };
  }
}
