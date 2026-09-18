import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
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

interface LiveQuote {
  providerSymbol: string;
  bidPrice?: string;
  askPrice?: string;
  lastPrice?: string;
  bidSize?: string;
  askSize?: string;
  eventTime: Date;
  sourceTimestamp?: Date;
}

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
export class CTraderLiveCandleBuilderService implements OnModuleInit {
  private readonly logger = new Logger(
    CTraderLiveCandleBuilderService.name,
  );

  /**
   * Realtime candles are maintained entirely in memory.
   *
   * Key:
   *   instrumentId:interval
   */
  private readonly states = new Map<string, LiveCandleState>();

  /**
   * cTrader reference data is loaded once per FIX logon.
   *
   * There must be no provider/alias DB lookup for every incoming quote.
   */
  private providerId: string | null = null;

  private readonly aliasesBySymbol = new Map<
    string,
    {
      instrumentId: string;
      providerSymbol: string;
    }
  >();

  constructor(
    private readonly client: CTraderFixClient,
    private readonly providerConfigRepository: MarketDataProviderConfigRepository,
    private readonly aliases: InstrumentAliasRepository,
    private readonly candles: MarketCandleRepository,
    private readonly streamPublisher: MarketDataStreamPublisher,
  ) {}

  onModuleInit(): void {
    this.client.on("quote", (quote: LiveQuote) => {
      /*
       * Deliberately synchronous.
       *
       * All candle state changes happen in memory before returning from the
       * EventEmitter callback. PostgreSQL is never awaited from the quote
       * path.
       */
      this.handleQuote(quote);
    });

    this.client.on("loggedOn", () => {
      void this.handleLoggedOn();
    });

    this.logger.log(
      `cTrader live candle builder registered for ${LIVE_INTERVALS.join(", ")}`,
    );
  }

  private async handleLoggedOn(): Promise<void> {
    try {
      await this.loadLiveContext();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : String(error);

      this.logger.error(
        `Failed to initialize cTrader live candle context: ${message}`,
      );
    }
  }

  private async loadLiveContext(): Promise<void> {
    const provider =
      await this.providerConfigRepository.findByType("CTRADER");

    this.providerId = null;
    this.aliasesBySymbol.clear();

    if (!provider || !provider.isActive) {
      this.logger.warn(
        "cTrader FIX logged on but no active CTRADER provider configuration exists.",
      );
      return;
    }

    const aliases = await this.aliases.findByProvider(provider.id);

    this.providerId = provider.id;

    for (const alias of aliases) {
      this.aliasesBySymbol.set(alias.providerSymbol, {
        instrumentId: alias.instrumentId,
        providerSymbol: alias.providerSymbol,
      });
    }

    this.logger.log(
      `Loaded cTrader live candle context: ${aliases.length} instrument alias(es).`,
    );
  }

  private handleQuote(quote: LiveQuote): void {
    if (!this.providerId) {
      return;
    }

    const alias = this.aliasesBySymbol.get(quote.providerSymbol);

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
      this.updateInterval(
        interval,
        alias.instrumentId,
        this.providerId,
        quote.providerSymbol,
        eventTimeMs,
        price,
        quote,
      );
    }
  }

  private updateInterval(
    interval: CandleIntervalType,
    instrumentId: string,
    providerId: string,
    providerSymbol: string,
    eventTimeMs: number,
    price: string,
    quote: LiveQuote,
  ): void {
    const intervalMs = CANDLE_INTERVAL_MS[interval];

    if (!intervalMs) {
      return;
    }

    const bucketMs =
      Math.floor(eventTimeMs / intervalMs) * intervalMs;

    const bucketTime = new Date(bucketMs);
    const key = `${instrumentId}:${interval}`;

    const existing = this.states.get(key);

    /*
     * First quote for this instrument/interval.
     */
    if (!existing) {
      const state = this.createState(
        instrumentId,
        providerId,
        providerSymbol,
        interval,
        bucketTime,
        price,
        quote,
      );

      this.states.set(key, state);
      this.publish(state);

      return;
    }

    /*
     * New candle bucket.
     */
    if (existing.eventTime.getTime() !== bucketMs) {
      /*
       * The only realtime DB persistence performed by this service:
       *
       * completed 1-minute candle → PostgreSQL.
       *
       * Higher timeframes remain memory/WebSocket only.
       */
      if (interval === CandleInterval.ONE_MINUTE) {
        this.persistCompletedOneMinuteCandle(existing);
      }

      const state = this.createState(
        instrumentId,
        providerId,
        providerSymbol,
        interval,
        bucketTime,
        price,
        quote,
      );

      this.states.set(key, state);
      this.publish(state);

      return;
    }

    /*
     * Same candle:
     *
     * Update OHLCV entirely in memory.
     */
    existing.high = this.maxDecimal(existing.high, price);
    existing.low = this.minDecimal(existing.low, price);
    existing.close = price;
    existing.volume = this.addDecimal(
      existing.volume,
      this.resolveVolume(quote),
    );
    existing.sourceTimestamp = quote.sourceTimestamp;

    /*
     * Realtime clients receive the updated candle immediately.
     * No database operation occurs here.
     */
    this.publish(existing);
  }

  private createState(
    instrumentId: string,
    providerId: string,
    providerSymbol: string,
    interval: CandleIntervalType,
    eventTime: Date,
    price: string,
    quote: LiveQuote,
  ): LiveCandleState {
    return {
      instrumentId,
      providerId,
      providerSymbol,
      interval,
      eventTime,
      open: price,
      high: price,
      low: price,
      close: price,
      volume: this.resolveVolume(quote),
      sourceTimestamp: quote.sourceTimestamp,
    };
  }

  private publish(state: LiveCandleState): void {
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

  private persistCompletedOneMinuteCandle(
    state: LiveCandleState,
  ): void {
    /*
     * This write is intentionally fire-and-forget.
     *
     * The quote/event loop must never wait for PostgreSQL.
     *
     * There is only one such write per instrument per completed minute.
     */
    void this.candles
      .upsert({
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
      })
      .catch((error: unknown) => {
        const message =
          error instanceof Error ? error.message : String(error);

        this.logger.error(
          `Failed to persist completed cTrader 1m candle for ` +
            `${state.providerSymbol} @ ${state.eventTime.toISOString()}: ${message}`,
        );
      });
  }

  private resolvePrice(quote: LiveQuote): string | null {
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

  private resolveVolume(quote: LiveQuote): string {
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
