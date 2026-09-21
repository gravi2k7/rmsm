import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

import {
  MarketDataWebSocketClient,
  type MarketDataCandleEvent,
  type MarketDataQuoteEvent,
} from "../market-data-websocket.client";

const authState: { accessToken: string | null } = {
  accessToken: "test-access-token",
};

vi.mock("@/lib/auth-store", () => ({
  useAuthStore: {
    getState: () => authState,
  },
}));

function getSocket(index = 0): FakeWebSocket {
  const socket = FakeWebSocket.instances[index];

  if (!socket) {
    throw new Error(`Expected WebSocket instance at index ${index}`);
  }

  return socket;
}

class FakeWebSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;

  static instances: FakeWebSocket[] = [];

  readonly url: string;

  readyState = FakeWebSocket.CONNECTING;

  private readonly listeners = new Map<
    string,
    Set<(event: unknown) => void>
  >();

  sent: string[] = [];

  constructor(url: string) {
    this.url = url;
    FakeWebSocket.instances.push(this);
  }

  addEventListener(
    type: string,
    listener: (event: unknown) => void,
  ): void {
    const listeners = this.listeners.get(type) ?? new Set();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  send(data: string): void {
    this.sent.push(data);
  }

  close(): void {
    this.readyState = FakeWebSocket.CLOSED;
    this.emit("close", {});
  }

  open(): void {
    this.readyState = FakeWebSocket.OPEN;
    this.emit("open", {});
  }

  message(data: unknown): void {
    this.emit("message", { data });
  }

  error(): void {
    this.emit("error", {});
  }

  private emit(type: string, event: unknown): void {
    for (const listener of this.listeners.get(type) ?? []) {
      listener(event);
    }
  }
}

describe("MarketDataWebSocketClient", () => {
  beforeEach(() => {
    FakeWebSocket.instances = [];
    authState.accessToken = "test-access-token";

    vi.stubGlobal("WebSocket", FakeWebSocket);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("connects using the current access token", () => {
    const client = new MarketDataWebSocketClient();

    client.connect();

    expect(FakeWebSocket.instances).toHaveLength(1);
    expect(getSocket().url).toContain(
      "/api/v1/market-data/ws?accessToken=test-access-token",
    );
  });

  it("reports an error when no access token exists", () => {
    authState.accessToken = null;

    const onError = vi.fn();

    const client = new MarketDataWebSocketClient({
      onError,
    });

    client.connect();

    expect(FakeWebSocket.instances).toHaveLength(0);
    expect(onError).toHaveBeenCalledWith({
      error: "Authentication required",
    });
  });

  it("does not create a duplicate connection while connecting", () => {
    const client = new MarketDataWebSocketClient();

    client.connect();
    client.connect();

    expect(FakeWebSocket.instances).toHaveLength(1);
  });

  it("reports connected and resubscribes retained instruments", () => {
    const onConnected = vi.fn();

    const client = new MarketDataWebSocketClient({
      onConnected,
    });

    client.subscribe(["instrument-1", "instrument-2"]);
    client.connect();

    const socket = getSocket();

    socket.open();
    socket.message(
      JSON.stringify({
        type: "market-data.connected",
      }),
    );

    expect(onConnected).toHaveBeenCalledTimes(1);

    expect(socket.sent).toEqual([
      JSON.stringify({
        type: "market-data.subscribe",
        instrumentIds: ["instrument-1", "instrument-2"],
      }),
    ]);
  });

  it("sends subscribe messages for an open connection", () => {
    const client = new MarketDataWebSocketClient();

    client.connect();

    const socket = getSocket();
    socket.open();

    client.subscribe(["instrument-1", "instrument-2"]);

    expect(socket.sent).toEqual([
      JSON.stringify({
        type: "market-data.subscribe",
        instrumentIds: ["instrument-1", "instrument-2"],
      }),
    ]);

    expect(client.getSubscribedInstrumentIds()).toEqual([
      "instrument-1",
      "instrument-2",
    ]);
  });

  it("sends unsubscribe messages and removes retained subscriptions", () => {
    const client = new MarketDataWebSocketClient();

    client.connect();

    const socket = getSocket();
    socket.open();

    client.subscribe(["instrument-1", "instrument-2"]);
    client.unsubscribe(["instrument-1"]);

    expect(socket.sent).toEqual([
      JSON.stringify({
        type: "market-data.subscribe",
        instrumentIds: ["instrument-1", "instrument-2"],
      }),
      JSON.stringify({
        type: "market-data.unsubscribe",
        instrumentIds: ["instrument-1"],
      }),
    ]);

    expect(client.getSubscribedInstrumentIds()).toEqual([
      "instrument-2",
    ]);
  });

  it("dispatches quote events", () => {
    const onQuote = vi.fn();

    const client = new MarketDataWebSocketClient({
      onQuote,
    });

    client.connect();

    const socket = getSocket();
    socket.open();

    const quote: MarketDataQuoteEvent = {
      instrumentId: "instrument-1",
      providerSymbol: "EURUSD",
      bidPrice: "1.1000",
      askPrice: "1.1002",
      eventTime: "2026-08-24T10:00:00.000Z",
    };

    socket.message(
      JSON.stringify({
        type: "market-data.quote",
        data: quote,
      }),
    );

    expect(onQuote).toHaveBeenCalledWith(quote);
  });

  it("dispatches candle events", () => {
    const onCandle = vi.fn();

    const client = new MarketDataWebSocketClient({
      onCandle,
    });

    client.connect();

    const socket = getSocket();
    socket.open();

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

    socket.message(
      JSON.stringify({
        type: "market-data.candle",
        data: candle,
      }),
    );

    expect(onCandle).toHaveBeenCalledWith(candle);
  });

  it("reports server errors", () => {
    const onError = vi.fn();

    const client = new MarketDataWebSocketClient({
      onError,
    });

    client.connect();

    const socket = getSocket();
    socket.open();

    socket.message(
      JSON.stringify({
        type: "market-data.error",
        error: "Invalid or expired access token.",
      }),
    );

    expect(onError).toHaveBeenCalledWith({
      error: "Invalid or expired access token.",
    });
  });

  it("reports malformed messages", () => {
    const onError = vi.fn();

    const client = new MarketDataWebSocketClient({
      onError,
    });

    client.connect();

    const socket = getSocket();
    socket.open();

    socket.message("{invalid-json");

    expect(onError).toHaveBeenCalledWith({
      error: "Invalid market-data WebSocket message",
    });
  });

  it("reconnects after an unexpected close", () => {
    vi.useFakeTimers();

    const client = new MarketDataWebSocketClient();

    client.connect();

    const firstSocket = getSocket();

    firstSocket.open();
    firstSocket.close();

    expect(FakeWebSocket.instances).toHaveLength(1);

    vi.advanceTimersByTime(1_000);

    expect(FakeWebSocket.instances).toHaveLength(2);
  });

  it("uses the latest access token after reconnect", () => {
    vi.useFakeTimers();

    const client = new MarketDataWebSocketClient();

    client.connect();

    const firstSocket = getSocket();

    firstSocket.open();
    firstSocket.close();

    authState.accessToken = "refreshed-access-token";

    vi.advanceTimersByTime(1_000);

    expect(getSocket(1).url).toContain(
      "accessToken=refreshed-access-token",
    );
  });

  it("does not reconnect after an intentional disconnect", () => {
    vi.useFakeTimers();

    const client = new MarketDataWebSocketClient();

    client.connect();

    const socket = getSocket();

    socket.open();
    client.disconnect();

    vi.advanceTimersByTime(30_000);

    expect(FakeWebSocket.instances).toHaveLength(1);
  });

  it("notifies when the socket disconnects", () => {
    const onDisconnected = vi.fn();

    const client = new MarketDataWebSocketClient({
      onDisconnected,
    });

    client.connect();

    const socket = getSocket();

    socket.open();
    socket.close();

    expect(onDisconnected).toHaveBeenCalledTimes(1);
  });
});
