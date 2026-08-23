import { Injectable, Logger } from "@nestjs/common";
import {
  CandleInterval,
  MarketDataSource,
  type CandleInterval as CandleIntervalType,
} from "@rmsm/database";

import { CTraderFixClient } from "../providers/ctrader/ctrader-fix.client";
import { InstrumentAliasRepository } from "../repositories/instrument-alias.repository";
import { MarketCandleRepository } from "../repositories/market-candle.repository";
import { MarketDataProviderConfigRepository } from "../repositories/market-data-provider-config.repository";
import { CANDLE_INTERVAL_MS } from "../constants/candle-interval.constants";
import { MarketDataStreamPublisher } from "./market-data-stream.publisher";

interface LiveCandleState {
  instrumentId: string;
  providerId: string;
  providerSymbol: string;
  interval: CandleIntervalType;
  eventTime: Date;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  sourceTimestamp?: Date;
}

const LIVE_INTERVALS: CandleIntervalType[] = [
  CandleInterval.ONE_MINUTE,
  CandleInterval.FIVE_MINUTES,
  CandleInterval.FIFTEEN_MINUTES,
  CandleInterval.THIRTY_MINUTES,
  CandleInterval.ONE_HOUR,
  CandleInterval.FOUR_HOURS,
  CandleInterval.ONE_DAY,
];

@Injectable()
export class CTraderLiveCandleBuilderService {
  private readonly logger = new Logger(
    CTraderLiveCandleBuilderService.name,
  );

  private readonly states = new Map<string, LiveCandleState>();

  constructor(
    private readonly client: CTraderFixClient,
    private readonly providerConfigRepository: MarketDataProviderConfigRepository,
    private readonly aliases: InstrumentAliasRepository,
    private readonly candles: MarketCandleRepository,
    private readonly streamPublisher: MarketDataStreamPublisher,
  ) {}

  onModuleInit(): void {
    this.client.on("quote", (quote) => {
      void this.processQuote(quote).catch((error: unknown) => {
        const message =
          error instanceof Error ? error.message : String(error);

        this.logger.error(
          `Failed to build cTrader live candles for ${quote.providerSymbol}: ${message}`,
        );
      });
    });

    this.logger.log(
      `cTrader live candle builder registered for ${LIVE_INTERVALS.join(", ")}`,
    );
  }

  private async processQuote(quote: {
    providerSymbol: string;
    bidPrice?: string;
    askPrice?: string;
    lastPrice?: string;
    bidSize?: string;
    askSize?: string;
    eventTime: Date;
    sourceTimestamp?: Date;
  }): Promise<void> {
    const provider =
      await this.providerConfigRepository.findByType("CTRADER");

    if (!provider || !provider.isActive) {
      return;
    }

    const alias = await this.aliases.findByProviderSymbol(
      provider.id,
      quote.providerSymbol,
    );

    if (!alias) {
      return;
    }

    const price = this.resolvePrice(quote);

    if (price === null) {
      return;
    }

    const numericPrice = Number(price);

    if (!Number.isFinite(numericPrice)) {
      return;
    }

    const eventTimeMs = quote.eventTime.getTime();

    for (const interval of LIVE_INTERVALS) {
      await this.updateInterval(
        interval,
        alias.instrumentId,
        provider.id,
        quote.providerSymbol,
        eventTimeMs,
        price,
        quote,
      );
    }
  }

  private async updateInterval(
    interval: CandleIntervalType,
    instrumentId: string,
    providerId: string,
    providerSymbol: string,
    eventTimeMs: number,
    price: string,
    quote: {
      bidSize?: string;
      askSize?: string;
      sourceTimestamp?: Date;
    },
  ): Promise<void> {
    const intervalMs = CANDLE_INTERVAL_MS[interval];

    if (!intervalMs) {
      return;
    }

    const bucketMs =
      Math.floor(eventTimeMs / intervalMs) * intervalMs;

    const bucketTime = new Date(bucketMs);

    const key = `${instrumentId}:${interval}`;

    const existing = this.states.get(key);

    if (!existing || existing.eventTime.getTime() !== bucketMs) {
      const state: LiveCandleState = {
        instrumentId,
        providerId,
        providerSymbol,
        interval,
        eventTime: bucketTime,
        open: price,
        high: price,
        low: price,
        close: price,
        volume: this.resolveVolume(quote),
        sourceTimestamp: quote.sourceTimestamp,
      };

      this.states.set(key, state);

      await this.persist(state);

      this.logger.debug(
        `Started cTrader ${interval} candle: ${providerSymbol} @ ${bucketTime.toISOString()}`,
      );

      return;
    }

    existing.high = this.maxDecimal(existing.high, price);
    existing.low = this.minDecimal(existing.low, price);
    existing.close = price;
    existing.volume = this.addDecimal(
      existing.volume,
      this.resolveVolume(quote),
    );
    existing.sourceTimestamp = quote.sourceTimestamp;

    await this.persist(existing);
  }

  private async persist(state: LiveCandleState): Promise<void> {
    await this.candles.upsert({
      instrumentId: state.instrumentId,
      interval: state.interval,
      eventTime: state.eventTime,
      open: state.open,
      high: state.high,
      low: state.low,
      close: state.close,
      volume: state.volume,
      providerId: state.providerId,
      source: MarketDataSource.LIVE,
      sourceTimestamp: state.sourceTimestamp,
    });

    this.streamPublisher.publishCandle({
      instrumentId: state.instrumentId,
      providerSymbol: state.providerSymbol,
      interval: state.interval,
      eventTime: state.eventTime,
      open: state.open,
      high: state.high,
      low: state.low,
      close: state.close,
      volume: state.volume,
      providerId: state.providerId,
      source: MarketDataSource.LIVE,
      sourceTimestamp: state.sourceTimestamp,
    });
  }

  private resolvePrice(quote: {
    bidPrice?: string;
    askPrice?: string;
    lastPrice?: string;
  }): string | null {
    if (quote.lastPrice) {
      return quote.lastPrice;
    }

    if (quote.bidPrice && quote.askPrice) {
      const bid = Number(quote.bidPrice);
      const ask = Number(quote.askPrice);

      if (Number.isFinite(bid) && Number.isFinite(ask)) {
        return ((bid + ask) / 2).toString();
      }
    }

    return quote.bidPrice ?? quote.askPrice ?? null;
  }

  private resolveVolume(quote: {
    bidSize?: string;
    askSize?: string;
  }): string {
    const bid = quote.bidSize ? Number(quote.bidSize) : 0;
    const ask = quote.askSize ? Number(quote.askSize) : 0;

    if (Number.isFinite(bid) && Number.isFinite(ask)) {
      return ((bid + ask) / 2).toString();
    }

    if (Number.isFinite(bid)) {
      return String(bid);
    }

    if (Number.isFinite(ask)) {
      return String(ask);
    }

    return "0";
  }

  private maxDecimal(a: string, b: string): string {
    return Number(a) >= Number(b) ? a : b;
  }

  private minDecimal(a: string, b: string): string {
    return Number(a) <= Number(b) ? a : b;
  }

  private addDecimal(a: string, b: string): string {
    return (Number(a) + Number(b)).toString();
  }
}
