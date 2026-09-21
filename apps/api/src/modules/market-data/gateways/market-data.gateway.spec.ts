import { describe, expect, it, jest } from "@jest/globals";

import { MarketDataGateway } from "./market-data.gateway";
import {
  MarketDataStreamPublisher,
  type MarketDataDepthStreamPayload,
  type MarketDataQuoteStreamPayload,
} from "../services/market-data-stream.publisher";

function createClient() {
  const listeners = new Map<string, (...args: any[]) => void>();

  return {
    readyState: 1,
    send: jest.fn(),
    ping: jest.fn(),
    on: jest.fn((event: string, listener: (...args: any[]) => void) => {
      listeners.set(event, listener);
    }),
    emit: (event: string, ...args: any[]) => {
      listeners.get(event)?.(...args);
    },
  } as any;
}

function createPublisher() {
  const quoteListeners = new Set<
    (payload: MarketDataQuoteStreamPayload) => void
  >();
  const depthListeners = new Set<
    (payload: MarketDataDepthStreamPayload) => void
  >();

  return {
    onQuote: jest.fn((listener) => quoteListeners.add(listener)),
    offQuote: jest.fn((listener) => quoteListeners.delete(listener)),
    onCandle: jest.fn(),
    offCandle: jest.fn(),
    onDepth: jest.fn((listener) => depthListeners.add(listener)),
    offDepth: jest.fn((listener) => depthListeners.delete(listener)),
    emitQuote: (payload: MarketDataQuoteStreamPayload) => {
      for (const listener of quoteListeners) {
        listener(payload);
      }
    },
    emitDepth: (payload: MarketDataDepthStreamPayload) => {
      for (const listener of depthListeners) {
        listener(payload);
      }
    },
  } as unknown as MarketDataStreamPublisher & {
    emitQuote: (payload: MarketDataQuoteStreamPayload) => void;
    emitDepth: (payload: MarketDataDepthStreamPayload) => void;
  };
}

function sentMessages(client: any): any[] {
  return client.send.mock.calls.map(([message]: [string]) =>
    JSON.parse(message),
  );
}

const BTC = "btc-instrument";
const GOLD = "gold-instrument";

function quote(instrumentId: string): MarketDataQuoteStreamPayload {
  return {
    instrumentId,
    providerSymbol: instrumentId,
    bidPrice: "100.00",
    askPrice: "100.10",
    eventTime: new Date("2026-09-19T04:00:00.000Z"),
    sourceTimestamp: new Date("2026-09-19T04:00:00.000Z"),
  };
}

describe("MarketDataGateway", () => {
  it("starts a heartbeat for connected clients", () => {
    jest.useFakeTimers();

    const publisher = createPublisher();
    const gateway = new MarketDataGateway(publisher);
    const client = createClient();

    gateway.handleConnection(client);

    expect(client.ping).not.toHaveBeenCalled();

    jest.advanceTimersByTime(25_000);

    expect(client.ping).toHaveBeenCalledTimes(1);

    gateway.onModuleDestroy();
    jest.useRealTimers();
  });

  it("stops the heartbeat after the last client disconnects", () => {
    jest.useFakeTimers();

    const publisher = createPublisher();
    const gateway = new MarketDataGateway(publisher);
    const client = createClient();

    gateway.handleConnection(client);
    gateway.handleDisconnect(client);

    jest.advanceTimersByTime(50_000);

    expect(client.ping).not.toHaveBeenCalled();

    gateway.onModuleDestroy();
    jest.useRealTimers();
  });

  it("cleans up the heartbeat timer when the gateway is destroyed", () => {
    jest.useFakeTimers();

    const publisher = createPublisher();
    const gateway = new MarketDataGateway(publisher);
    const client = createClient();

    gateway.handleConnection(client);
    gateway.onModuleDestroy();

    jest.advanceTimersByTime(50_000);

    expect(client.ping).not.toHaveBeenCalled();

    jest.useRealTimers();
  });

  it("sends connected message when a client connects", () => {
    const publisher = createPublisher();
    const gateway = new MarketDataGateway(publisher);
    const client = createClient();

    gateway.handleConnection(client);

    expect(sentMessages(client)).toEqual([
      {
        type: "market-data.connected",
      },
    ]);

    gateway.onModuleDestroy();
  });

  it("acknowledges instrument subscriptions", () => {
    const publisher = createPublisher();
    const gateway = new MarketDataGateway(publisher);
    const client = createClient();

    gateway.handleConnection(client);

    client.emit(
      "message",
      Buffer.from(
        JSON.stringify({
          type: "market-data.subscribe",
          instrumentIds: [BTC],
        }),
      ),
    );

    expect(sentMessages(client)).toContainEqual({
      type: "market-data.subscribed",
      data: {
        instrumentIds: [BTC],
      },
    });

    gateway.onModuleDestroy();
  });

  it("delivers quotes only to subscribed clients", () => {
    const publisher = createPublisher();
    const gateway = new MarketDataGateway(publisher);

    const btcClient = createClient();
    const goldClient = createClient();

    gateway.handleConnection(btcClient);
    gateway.handleConnection(goldClient);

    btcClient.emit(
      "message",
      Buffer.from(
        JSON.stringify({
          type: "market-data.subscribe",
          instrumentIds: [BTC],
        }),
      ),
    );

    goldClient.emit(
      "message",
      Buffer.from(
        JSON.stringify({
          type: "market-data.subscribe",
          instrumentIds: [GOLD],
        }),
      ),
    );

    btcClient.send.mockClear();
    goldClient.send.mockClear();

    publisher.emitQuote(quote(BTC));

    expect(sentMessages(btcClient)).toHaveLength(1);
    expect(sentMessages(btcClient)[0]).toMatchObject({
      type: "market-data.quote",
      data: {
        instrumentId: BTC,
        bidPrice: "100.00",
        askPrice: "100.10",
      },
    });

    expect(sentMessages(goldClient)).toHaveLength(0);

    gateway.onModuleDestroy();
  });

  it("delivers depth only to subscribed clients", () => {
    const publisher = createPublisher();
    const gateway = new MarketDataGateway(publisher);

    const btcClient = createClient();
    const goldClient = createClient();

    gateway.handleConnection(btcClient);
    gateway.handleConnection(goldClient);

    btcClient.emit(
      "message",
      Buffer.from(
        JSON.stringify({
          type: "market-data.subscribe",
          instrumentIds: [BTC],
        }),
      ),
    );

    goldClient.emit(
      "message",
      Buffer.from(
        JSON.stringify({
          type: "market-data.subscribe",
          instrumentIds: [GOLD],
        }),
      ),
    );

    btcClient.send.mockClear();
    goldClient.send.mockClear();

    publisher.emitDepth({
      instrumentId: BTC,
      providerSymbol: "BTCUSD",
      bids: [
        { price: "100.00", size: "2" },
        { price: "99.90", size: "3" },
      ],
      asks: [
        { price: "100.10", size: "4" },
        { price: "100.20", size: "5" },
      ],
      eventTime: new Date("2026-09-19T04:00:00.000Z"),
    });

    expect(sentMessages(btcClient)).toHaveLength(1);
    expect(sentMessages(btcClient)[0]).toEqual({
      type: "market-data.depth",
      data: {
        instrumentId: BTC,
        providerSymbol: "BTCUSD",
        bids: [
          { price: "100.00", size: "2" },
          { price: "99.90", size: "3" },
        ],
        asks: [
          { price: "100.10", size: "4" },
          { price: "100.20", size: "5" },
        ],
        eventTime: "2026-09-19T04:00:00.000Z",
      },
    });

    expect(sentMessages(goldClient)).toHaveLength(0);

    gateway.onModuleDestroy();
  });

  it("supports multiple subscriptions on one client", () => {
    const publisher = createPublisher();
    const gateway = new MarketDataGateway(publisher);
    const client = createClient();

    gateway.handleConnection(client);

    client.emit(
      "message",
      Buffer.from(
        JSON.stringify({
          type: "market-data.subscribe",
          instrumentIds: [BTC, GOLD],
        }),
      ),
    );

    client.send.mockClear();

    publisher.emitQuote(quote(BTC));
    publisher.emitQuote(quote(GOLD));

    const messages = sentMessages(client);

    expect(messages).toHaveLength(2);
    expect(messages[0].type).toBe("market-data.quote");
    expect(messages[1].type).toBe("market-data.quote");
     gateway.onModuleDestroy();
  });

  it("removes subscriptions after unsubscribe", () => {
    const publisher = createPublisher();
    const gateway = new MarketDataGateway(publisher);
    const client = createClient();

    gateway.handleConnection(client);

    client.emit(
      "message",
      Buffer.from(
        JSON.stringify({
          type: "market-data.subscribe",
          instrumentIds: [BTC],
        }),
      ),
    );

    client.emit(
      "message",
      Buffer.from(
        JSON.stringify({
          type: "market-data.unsubscribe",
          instrumentIds: [BTC],
        }),
      ),
    );

    client.send.mockClear();

    publisher.emitQuote(quote(BTC));

    expect(sentMessages(client)).toHaveLength(0);
     gateway.onModuleDestroy();
  });

  it("cleans subscriptions when a client disconnects", () => {
    const publisher = createPublisher();
    const gateway = new MarketDataGateway(publisher);
    const client = createClient();

    gateway.handleConnection(client);

    client.emit(
      "message",
      Buffer.from(
        JSON.stringify({
          type: "market-data.subscribe",
          instrumentIds: [BTC],
        }),
      ),
    );

    gateway.handleDisconnect(client);

    publisher.emitQuote(quote(BTC));

    expect(client.send).toHaveBeenCalledTimes(2);
  });

  it("rejects invalid subscription payloads", () => {
    const publisher = createPublisher();
    const gateway = new MarketDataGateway(publisher);
    const client = createClient();

    gateway.handleConnection(client);
    client.send.mockClear();

    client.emit(
      "message",
      Buffer.from(
        JSON.stringify({
          type: "market-data.subscribe",
          instrumentIds: "not-an-array",
        }),
      ),
    );

    expect(sentMessages(client)).toEqual([
      {
        type: "market-data.error",
        error: {
          code: "INVALID_SUBSCRIPTION",
          message: "instrumentIds must contain at least one instrument ID.",
        },
      },
    ]);
     gateway.onModuleDestroy();
  });

  it("rejects malformed JSON", () => {
    const publisher = createPublisher();
    const gateway = new MarketDataGateway(publisher);
    const client = createClient();

    gateway.handleConnection(client);
    client.send.mockClear();

    client.emit("message", Buffer.from("{invalid-json"));

    expect(sentMessages(client)).toEqual([
      {
        type: "market-data.error",
        error: {
          code: "INVALID_MESSAGE",
          message: "Invalid JSON message.",
        },
      },
    ]);
     gateway.onModuleDestroy();
  });

  it("removes publisher listeners on module destroy", () => {
    const publisher = createPublisher();
    const gateway = new MarketDataGateway(publisher);

    gateway.onModuleDestroy();

    expect(publisher.offQuote).toHaveBeenCalledTimes(1);
    expect(publisher.offCandle).toHaveBeenCalledTimes(1);
  });
});
