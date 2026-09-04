import { describe, expect, it, vi } from "vitest";

import {
  MarketDataRealtimeService,
  type MarketDataRealtimeClient,
} from "../market-data-realtime.service";

import type {
  MarketDataCandleEvent,
  MarketDataQuoteEvent,
} from "../market-data-websocket.client";

function createClientMock(): MarketDataRealtimeClient {
  return {
    connect: vi.fn(),
    disconnect: vi.fn(),
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
    isConnected: vi.fn(() => false),
  };
}

function createEventBridge() {
  let quoteListener:
    | ((quote: MarketDataQuoteEvent) => void)
    | undefined;

  let candleListener:
    | ((candle: MarketDataCandleEvent) => void)
    | undefined;

  return {
    onQuote: (
      listener: (quote: MarketDataQuoteEvent) => void,
    ) => {
      quoteListener = listener;

      return () => {
        quoteListener = undefined;
      };
    },

    onCandle: (
      listener: (candle: MarketDataCandleEvent) => void,
    ) => {
      candleListener = listener;

      return () => {
        candleListener = undefined;
      };
    },

    emitQuote: (quote: MarketDataQuoteEvent) => {
      quoteListener?.(quote);
    },

    emitCandle: (candle: MarketDataCandleEvent) => {
      candleListener?.(candle);
    },
  };
}

describe("MarketDataRealtimeService", () => {
  it("subscribes an instrument only once for multiple consumers", () => {
    const client = createClientMock();
    const bridge = createEventBridge();

    const service = new MarketDataRealtimeService({
      client,
      onQuote: bridge.onQuote,
      onCandle: bridge.onCandle,
    });

    service.subscribe(["instrument-1"]);
    service.subscribe(["instrument-1"]);

    expect(service.getSubscriptionCount("instrument-1")).toBe(2);

    expect(client.subscribe).toHaveBeenCalledTimes(1);
    expect(client.subscribe).toHaveBeenCalledWith(["instrument-1"]);

    expect(client.connect).toHaveBeenCalledTimes(2);
  });

  it("unsubscribes only when the final consumer releases an instrument", () => {
    const client = createClientMock();
    const bridge = createEventBridge();

    const service = new MarketDataRealtimeService({
      client,
      onQuote: bridge.onQuote,
      onCandle: bridge.onCandle,
    });

    service.subscribe(["instrument-1"]);
    service.subscribe(["instrument-1"]);

    service.unsubscribe(["instrument-1"]);

    expect(service.getSubscriptionCount("instrument-1")).toBe(1);
    expect(client.unsubscribe).not.toHaveBeenCalled();
    expect(client.disconnect).not.toHaveBeenCalled();

    service.unsubscribe(["instrument-1"]);

    expect(service.getSubscriptionCount("instrument-1")).toBe(0);

    expect(client.unsubscribe).toHaveBeenCalledTimes(1);
    expect(client.unsubscribe).toHaveBeenCalledWith(["instrument-1"]);

    expect(client.disconnect).toHaveBeenCalledTimes(1);
  });

  it("keeps subscriptions independent across instruments", () => {
    const client = createClientMock();
    const bridge = createEventBridge();

    const service = new MarketDataRealtimeService({
      client,
      onQuote: bridge.onQuote,
      onCandle: bridge.onCandle,
    });

    service.subscribe(["instrument-1", "instrument-2"]);
    service.subscribe(["instrument-1"]);

    expect(service.getSubscriptionCount("instrument-1")).toBe(2);
    expect(service.getSubscriptionCount("instrument-2")).toBe(1);

    service.unsubscribe(["instrument-1"]);

    expect(service.getSubscriptionCount("instrument-1")).toBe(1);
    expect(service.getSubscriptionCount("instrument-2")).toBe(1);

    expect(client.unsubscribe).not.toHaveBeenCalled();

    service.unsubscribe(["instrument-2"]);

    expect(client.unsubscribe).toHaveBeenCalledWith(["instrument-2"]);
    expect(client.disconnect).not.toHaveBeenCalled();

    service.unsubscribe(["instrument-1"]);

    expect(client.unsubscribe).toHaveBeenCalledWith(["instrument-1"]);
    expect(client.disconnect).toHaveBeenCalledTimes(1);
  });

  it("ignores empty instrument ids", () => {
    const client = createClientMock();
    const bridge = createEventBridge();

    const service = new MarketDataRealtimeService({
      client,
      onQuote: bridge.onQuote,
      onCandle: bridge.onCandle,
    });

    service.subscribe([
      "",
      "instrument-1",
      "",
      "instrument-2",
    ]);

    expect(service.getSubscribedInstrumentIds()).toEqual([
      "instrument-1",
      "instrument-2",
    ]);

    expect(client.subscribe).toHaveBeenCalledWith([
      "instrument-1",
      "instrument-2",
    ]);
  });

  it("forwards quote events to registered listeners", () => {
    const client = createClientMock();
    const bridge = createEventBridge();

    const service = new MarketDataRealtimeService({
      client,
      onQuote: bridge.onQuote,
      onCandle: bridge.onCandle,
    });

    const listener = vi.fn();

    service.addQuoteListener(listener);

    const quote: MarketDataQuoteEvent = {
      instrumentId: "instrument-1",
      providerSymbol: "EURUSD",
      bidPrice: "1.1000",
      askPrice: "1.1002",
      eventTime: "2026-08-24T10:00:00.000Z",
    };

    bridge.emitQuote(quote);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(quote);
  });

  it("removes quote listeners through the returned cleanup function", () => {
    const client = createClientMock();
    const bridge = createEventBridge();

    const service = new MarketDataRealtimeService({
      client,
      onQuote: bridge.onQuote,
      onCandle: bridge.onCandle,
    });

    const listener = vi.fn();

    const remove = service.addQuoteListener(listener);

    remove();

    bridge.emitQuote({
      instrumentId: "instrument-1",
      providerSymbol: "EURUSD",
      eventTime: "2026-08-24T10:00:00.000Z",
    });

    expect(listener).not.toHaveBeenCalled();
  });

  it("forwards candle events to registered listeners", () => {
    const client = createClientMock();
    const bridge = createEventBridge();

    const service = new MarketDataRealtimeService({
      client,
      onQuote: bridge.onQuote,
      onCandle: bridge.onCandle,
    });

    const listener = vi.fn();

    service.addCandleListener(listener);

    const candle: MarketDataCandleEvent = {
      instrumentId: "instrument-1",
      providerSymbol: "EURUSD",
      providerId: "provider-1",
      interval: "ONE_MINUTE",
      source: "LIVE",
      eventTime: "2026-08-24T10:00:00.000Z",
      open: "1.1000",
      high: "1.1010",
      low: "1.0990",
      close: "1.1005",
      volume: "10",
    };

    bridge.emitCandle(candle);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(candle);
  });

  it("delegates explicit connect and disconnect", () => {
    const client = createClientMock();
    const bridge = createEventBridge();

    const service = new MarketDataRealtimeService({
      client,
      onQuote: bridge.onQuote,
      onCandle: bridge.onCandle,
    });

    service.connect();
    service.disconnect();

    expect(client.connect).toHaveBeenCalledTimes(1);
    expect(client.disconnect).toHaveBeenCalledTimes(1);
  });

  it("reports the underlying connection state", () => {
    const client = createClientMock();
    const bridge = createEventBridge();

    vi.mocked(client.isConnected).mockReturnValue(true);

    const service = new MarketDataRealtimeService({
      client,
      onQuote: bridge.onQuote,
      onCandle: bridge.onCandle,
    });

    expect(service.isConnected()).toBe(true);
  });

  it("destroy removes listeners, subscriptions, and connection", () => {
    const client = createClientMock();
    const bridge = createEventBridge();

    const service = new MarketDataRealtimeService({
      client,
      onQuote: bridge.onQuote,
      onCandle: bridge.onCandle,
    });

    const quoteListener = vi.fn();
    const candleListener = vi.fn();

    service.addQuoteListener(quoteListener);
    service.addCandleListener(candleListener);

    service.subscribe(["instrument-1", "instrument-2"]);

    service.destroy();

    expect(service.getSubscribedInstrumentIds()).toEqual([]);
    expect(service.getSubscriptionCount("instrument-1")).toBe(0);
    expect(service.getSubscriptionCount("instrument-2")).toBe(0);

    expect(client.disconnect).toHaveBeenCalled();

    bridge.emitQuote({
      instrumentId: "instrument-1",
      providerSymbol: "EURUSD",
      eventTime: "2026-08-24T10:00:00.000Z",
    });

    bridge.emitCandle({
      instrumentId: "instrument-1",
      providerSymbol: "EURUSD",
      providerId: "provider-1",
      interval: "ONE_MINUTE",
      source: "LIVE",
      eventTime: "2026-08-24T10:00:00.000Z",
      open: "1",
      high: "2",
      low: "0",
      close: "1.5",
      volume: "10",
    });

    expect(quoteListener).not.toHaveBeenCalled();
    expect(candleListener).not.toHaveBeenCalled();
  });
});
