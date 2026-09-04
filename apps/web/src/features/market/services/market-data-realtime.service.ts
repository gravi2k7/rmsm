import type {
  MarketDataCandleEvent,
  MarketDataDepthEvent,
  MarketDataQuoteEvent,
} from "./market-data-websocket.client";

export interface MarketDataRealtimeClient {
  connect(): void;
  disconnect(): void;
  subscribe(instrumentIds: readonly string[]): void;
  unsubscribe(instrumentIds: readonly string[]): void;
  isConnected(): boolean;
}

export type MarketDataQuoteListener = (
  quote: MarketDataQuoteEvent,
) => void;

export type MarketDataCandleListener = (
  candle: MarketDataCandleEvent,
) => void;

export type MarketDataDepthListener = (
  depth: MarketDataDepthEvent,
) => void;

export interface MarketDataRealtimeServiceOptions {
  client: MarketDataRealtimeClient;
  onQuote?: (listener: MarketDataQuoteListener) => () => void;
  onCandle?: (listener: MarketDataCandleListener) => () => void;
  onDepth?: (listener: MarketDataDepthListener) => () => void;
}

interface SubscriptionState {
  count: number;
}

export class MarketDataRealtimeService {
  private readonly client: MarketDataRealtimeClient;

  private readonly subscriptions = new Map<
    string,
    SubscriptionState
  >();

  private readonly quoteListeners = new Set<MarketDataQuoteListener>();

  private readonly candleListeners = new Set<MarketDataCandleListener>();

  private readonly depthListeners = new Set<MarketDataDepthListener>();

  private readonly removeQuoteClientListener?: () => void;

  private readonly removeCandleClientListener?: () => void;

  private readonly removeDepthClientListener?: () => void;

  constructor(options: MarketDataRealtimeServiceOptions) {
    this.client = options.client;

    this.removeQuoteClientListener = options.onQuote?.((quote) => {
      for (const listener of this.quoteListeners) {
        listener(quote);
      }
    });

    this.removeCandleClientListener = options.onCandle?.((candle) => {
      for (const listener of this.candleListeners) {
        listener(candle);
      }
    });

    this.removeDepthClientListener = options.onDepth?.((depth) => {
      for (const listener of this.depthListeners) {
        listener(depth);
      }
    });
  }

  connect(): void {
    this.client.connect();
  }

  disconnect(): void {
    this.client.disconnect();
  }

  subscribe(instrumentIds: readonly string[]): void {
    const newlySubscribed: string[] = [];

    for (const instrumentId of instrumentIds) {
      if (!instrumentId) {
        continue;
      }

      const current = this.subscriptions.get(instrumentId);

      if (current) {
        current.count += 1;
        continue;
      }

      this.subscriptions.set(instrumentId, {
        count: 1,
      });

      newlySubscribed.push(instrumentId);
    }

    if (newlySubscribed.length > 0) {
      this.client.subscribe(newlySubscribed);
    }

    if (this.subscriptions.size > 0) {
      this.client.connect();
    }
  }

  unsubscribe(instrumentIds: readonly string[]): void {
    const noLongerSubscribed: string[] = [];

    for (const instrumentId of instrumentIds) {
      const current = this.subscriptions.get(instrumentId);

      if (!current) {
        continue;
      }

      current.count -= 1;

      if (current.count > 0) {
        continue;
      }

      this.subscriptions.delete(instrumentId);
      noLongerSubscribed.push(instrumentId);
    }

    if (noLongerSubscribed.length > 0) {
      this.client.unsubscribe(noLongerSubscribed);
    }

    if (this.subscriptions.size === 0) {
      this.client.disconnect();
    }
  }

  addQuoteListener(listener: MarketDataQuoteListener): () => void {
    this.quoteListeners.add(listener);

    return () => {
      this.quoteListeners.delete(listener);
    };
  }

  addCandleListener(listener: MarketDataCandleListener): () => void {
    this.candleListeners.add(listener);

    return () => {
      this.candleListeners.delete(listener);
    };
  }

  addDepthListener(listener: MarketDataDepthListener): () => void {
    this.depthListeners.add(listener);

    return () => {
      this.depthListeners.delete(listener);
    };
  }

  getSubscribedInstrumentIds(): string[] {
    return [...this.subscriptions.keys()];
  }

  getSubscriptionCount(instrumentId: string): number {
    return this.subscriptions.get(instrumentId)?.count ?? 0;
  }

  isConnected(): boolean {
    return this.client.isConnected();
  }

  destroy(): void {
    this.removeQuoteClientListener?.();
    this.removeCandleClientListener?.();
    this.removeDepthClientListener?.();

    this.quoteListeners.clear();
    this.candleListeners.clear();
    this.depthListeners.clear();

    this.subscriptions.clear();

    this.client.disconnect();
  }
}
