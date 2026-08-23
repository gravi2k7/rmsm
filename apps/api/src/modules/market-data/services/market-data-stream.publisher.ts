import { Injectable } from "@nestjs/common";
import { MarketDataSource } from "@rmsm/database";
import { EventEmitter } from "node:events";

export const MARKET_DATA_STREAM_EVENTS = {
  QUOTE: "market-data.quote",
  CANDLE: "market-data.candle",
} as const;

export interface MarketDataQuoteStreamPayload {
  instrumentId: string;
  providerSymbol: string;
  bidPrice?: string;
  askPrice?: string;
  lastPrice?: string;
  bidSize?: string;
  askSize?: string;
  eventTime: Date;
  sourceTimestamp?: Date;
}

export interface MarketDataCandleStreamPayload {
  instrumentId: string;
  providerSymbol: string;
  providerId: string;
  interval: string;
  source: MarketDataSource;
  eventTime: Date;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  sourceTimestamp?: Date;
}

@Injectable()
export class MarketDataStreamPublisher {
  private readonly emitter = new EventEmitter();

  constructor() {
    this.emitter.setMaxListeners(100);
  }

  publishQuote(payload: MarketDataQuoteStreamPayload): void {
    this.emitter.emit(MARKET_DATA_STREAM_EVENTS.QUOTE, payload);
  }

  publishCandle(payload: MarketDataCandleStreamPayload): void {
    this.emitter.emit(MARKET_DATA_STREAM_EVENTS.CANDLE, payload);
  }

  onQuote(
    listener: (payload: MarketDataQuoteStreamPayload) => void,
  ): void {
    this.emitter.on(MARKET_DATA_STREAM_EVENTS.QUOTE, listener);
  }

  onCandle(
    listener: (payload: MarketDataCandleStreamPayload) => void,
  ): void {
    this.emitter.on(MARKET_DATA_STREAM_EVENTS.CANDLE, listener);
  }

  offQuote(
    listener: (payload: MarketDataQuoteStreamPayload) => void,
  ): void {
    this.emitter.off(MARKET_DATA_STREAM_EVENTS.QUOTE, listener);
  }

  offCandle(
    listener: (payload: MarketDataCandleStreamPayload) => void,
  ): void {
    this.emitter.off(MARKET_DATA_STREAM_EVENTS.CANDLE, listener);
  }
}
