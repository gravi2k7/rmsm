import { Injectable } from "@nestjs/common";
import { MarketDataSource } from "@rmsm/database";
import { EventEmitter } from "node:events";

export const MARKET_DATA_STREAM_EVENTS = {
  QUOTE: "market-data.quote",
  CANDLE: "market-data.candle",
  DEPTH: "market-data.depth",
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

export interface MarketDataDepthLevel {
  price: string;
  size?: string;
}

export interface MarketDataDepthStreamPayload {
  instrumentId: string;
  providerSymbol: string;
  bids: MarketDataDepthLevel[];
  asks: MarketDataDepthLevel[];
  eventTime: Date;
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

  publishDepth(payload: MarketDataDepthStreamPayload): void {
    this.emitter.emit(MARKET_DATA_STREAM_EVENTS.DEPTH, payload);
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

  onDepth(
    listener: (payload: MarketDataDepthStreamPayload) => void,
  ): void {
    this.emitter.on(MARKET_DATA_STREAM_EVENTS.DEPTH, listener);
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

  offDepth(
    listener: (payload: MarketDataDepthStreamPayload) => void,
  ): void {
    this.emitter.off(MARKET_DATA_STREAM_EVENTS.DEPTH, listener);
  }
}
