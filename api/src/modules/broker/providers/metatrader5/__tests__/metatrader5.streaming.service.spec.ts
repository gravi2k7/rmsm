import { MetaTrader5StreamingService } from "../metatrader5.streaming.service";

class FakeWebSocket {
  static OPEN = 1;
  static instances: FakeWebSocket[] = [];
  readyState = FakeWebSocket.OPEN;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  sent: string[] = [];
  closed = false;

  constructor(public url: string) {
    FakeWebSocket.instances.push(this);
  }

  send(data: string): void {
    this.sent.push(data);
  }

  close(): void {
    this.closed = true;
    this.onclose?.();
  }

  emit(data: unknown): void {
    this.onmessage?.({ data: JSON.stringify(data) });
  }
}

describe("MetaTrader5StreamingService", () => {
  const originalWebSocket = (global as unknown as { WebSocket?: unknown }).WebSocket;

  beforeEach(() => {
    FakeWebSocket.instances = [];
    (global as unknown as { WebSocket: unknown }).WebSocket = FakeWebSocket;
  });

  afterEach(() => {
    (global as unknown as { WebSocket: unknown }).WebSocket = originalWebSocket;
  });

  it("subscribeTicks() lazily opens exactly one websocket connection to <gatewayUrl>/stream (http -> ws)", () => {
    const service = new MetaTrader5StreamingService("http://localhost:8222");

    service.subscribeTicks(["EURUSD"], jest.fn());

    expect(FakeWebSocket.instances).toHaveLength(1);
    expect(FakeWebSocket.instances[0]!.url).toBe("ws://localhost:8222/stream");
  });

  it("reuses the same connection across multiple subscribe calls", () => {
    const service = new MetaTrader5StreamingService("http://localhost:8222");

    service.subscribeTicks(["EURUSD"], jest.fn());
    service.subscribeOrderUpdates(jest.fn());
    service.subscribePositionUpdates(jest.fn());
    service.subscribeAccountUpdates(jest.fn());

    expect(FakeWebSocket.instances).toHaveLength(1);
  });

  it("dispatches a tick event to every tick handler", () => {
    const service = new MetaTrader5StreamingService("http://localhost:8222");
    const handler = jest.fn();
    service.subscribeTicks(["EURUSD"], handler);

    FakeWebSocket.instances[0]!.emit({ type: "tick", payload: { symbol: "EURUSD", bid: 1.1, ask: 1.1002, time: "2026-01-01T00:00:00.000Z" } });

    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ symbol: "EURUSD", bid: 1.1, ask: 1.1002 }));
  });

  it("dispatches order/position/account events to their own handler sets only", () => {
    const service = new MetaTrader5StreamingService("http://localhost:8222");
    const tickHandler = jest.fn();
    const orderHandler = jest.fn();
    service.subscribeTicks(["EURUSD"], tickHandler);
    service.subscribeOrderUpdates(orderHandler);

    FakeWebSocket.instances[0]!.emit({ type: "order", payload: { orderId: "o1", status: "FILLED", symbol: "EURUSD", type: "MARKET_BUY", volume: 1 } });

    expect(orderHandler).toHaveBeenCalledTimes(1);
    expect(tickHandler).not.toHaveBeenCalled();
  });

  it("ignores a malformed event without throwing", () => {
    const service = new MetaTrader5StreamingService("http://localhost:8222");
    service.subscribeTicks(["EURUSD"], jest.fn());

    expect(() => FakeWebSocket.instances[0]!.onmessage?.({ data: "not-json" })).not.toThrow();
  });

  it("unsubscribe() removes the handler and closes the socket once idle", () => {
    const service = new MetaTrader5StreamingService("http://localhost:8222");
    const handler = jest.fn();
    const subscription = service.subscribeTicks(["EURUSD"], handler);

    subscription.unsubscribe();

    expect(FakeWebSocket.instances[0]!.closed).toBe(true);
  });

  it("does not close the socket on unsubscribe while other subscriptions remain active", () => {
    const service = new MetaTrader5StreamingService("http://localhost:8222");
    const tickSub = service.subscribeTicks(["EURUSD"], jest.fn());
    service.subscribeOrderUpdates(jest.fn());

    tickSub.unsubscribe();

    expect(FakeWebSocket.instances[0]!.closed).toBe(false);
  });

  it("onModuleDestroy() closes an open socket", () => {
    const service = new MetaTrader5StreamingService("http://localhost:8222");
    service.subscribeTicks(["EURUSD"], jest.fn());

    service.onModuleDestroy();

    expect(FakeWebSocket.instances[0]!.closed).toBe(true);
  });

  it("re-opens a new connection after all subscriptions are dropped and a new one is made", () => {
    const service = new MetaTrader5StreamingService("http://localhost:8222");
    const sub = service.subscribeTicks(["EURUSD"], jest.fn());
    sub.unsubscribe();

    service.subscribeTicks(["GBPUSD"], jest.fn());

    expect(FakeWebSocket.instances).toHaveLength(2);
  });
});
