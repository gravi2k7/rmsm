import { MetaTrader5ConnectionManager } from "../metatrader5.connection-manager";
import { MetaTrader5ErrorMapper } from "../metatrader5.error-mapper";
import type { MetaTrader5Client } from "../metatrader5.client";

function buildClient(overrides: Partial<MetaTrader5Client> = {}): MetaTrader5Client {
  return {
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    reconnect: jest.fn().mockResolvedValue(undefined),
    isConnected: jest.fn().mockReturnValue(true),
    getConnectionStatus: jest.fn().mockReturnValue("CONNECTED"),
    ...overrides,
  } as unknown as MetaTrader5Client;
}

describe("MetaTrader5ConnectionManager", () => {
  let errorMapper: MetaTrader5ErrorMapper;

  beforeEach(() => {
    errorMapper = new MetaTrader5ErrorMapper();
  });

  it("connect() delegates to client.connect() and records connection health", async () => {
    const client = buildClient();
    const manager = new MetaTrader5ConnectionManager(client, errorMapper, 3, true);

    await manager.connect();

    expect(client.connect).toHaveBeenCalledTimes(1);
    const health = manager.getConnectionHealth();
    expect(health.status).toBe("CONNECTED");
    expect(health.lastConnectedAt).toBeInstanceOf(Date);
    expect(health.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it("retries a retryable connect() failure up to maxRetry times before succeeding", async () => {
    jest.useFakeTimers();
    const connectionFailed = { isConnectionFailed: true };
    const client = buildClient({ connect: jest.fn().mockRejectedValueOnce(connectionFailed).mockResolvedValueOnce(undefined) });
    const manager = new MetaTrader5ConnectionManager(client, errorMapper, 2, true);

    const promise = manager.connect();
    await jest.advanceTimersByTimeAsync(2_000);
    await promise;

    expect(client.connect).toHaveBeenCalledTimes(2);
    jest.useRealTimers();
  });

  it("does not retry a non-retryable failure (e.g. login_failed classification) and throws immediately", async () => {
    const client = buildClient({ connect: jest.fn().mockRejectedValue({ isLoginFailed: true }) });
    const manager = new MetaTrader5ConnectionManager(client, errorMapper, 3, true);

    await expect(manager.connect()).rejects.toMatchObject({ isLoginFailed: true });
    expect(client.connect).toHaveBeenCalledTimes(1);
  });

  it("exhausts retries and throws the last error once maxRetry attempts are used up", async () => {
    jest.useFakeTimers();
    const client = buildClient({ connect: jest.fn().mockRejectedValue({ isConnectionFailed: true }) });
    const manager = new MetaTrader5ConnectionManager(client, errorMapper, 1, true);

    const promise = manager.connect();
    const assertion = expect(promise).rejects.toMatchObject({ isConnectionFailed: true });
    await jest.advanceTimersByTimeAsync(2_000);
    await assertion;
    expect(client.connect).toHaveBeenCalledTimes(2);
    jest.useRealTimers();
  });

  it("disconnect() delegates to client.disconnect()", async () => {
    const client = buildClient();
    const manager = new MetaTrader5ConnectionManager(client, errorMapper, 3, true);

    await manager.disconnect();

    expect(client.disconnect).toHaveBeenCalledTimes(1);
  });

  it("isConnected() reflects the underlying client", () => {
    const client = buildClient({ isConnected: jest.fn().mockReturnValue(false) });
    const manager = new MetaTrader5ConnectionManager(client, errorMapper, 3, true);

    expect(manager.isConnected()).toBe(false);
  });

  it("autoReconnect() calls client.reconnect() when reconnectEnabled is true", async () => {
    const client = buildClient();
    const manager = new MetaTrader5ConnectionManager(client, errorMapper, 3, true);

    await manager.autoReconnect();

    expect(client.reconnect).toHaveBeenCalledTimes(1);
  });

  it("autoReconnect() is a no-op when reconnectEnabled (MT5_RECONNECT) is false", async () => {
    const client = buildClient();
    const manager = new MetaTrader5ConnectionManager(client, errorMapper, 3, false);

    await manager.autoReconnect();

    expect(client.reconnect).not.toHaveBeenCalled();
  });

  it("autoReconnect() propagates a reconnect failure rather than swallowing it", async () => {
    const client = buildClient({ reconnect: jest.fn().mockRejectedValue({ isConnectionFailed: true }) });
    const manager = new MetaTrader5ConnectionManager(client, errorMapper, 3, true);

    await expect(manager.autoReconnect()).rejects.toMatchObject({ isConnectionFailed: true });
  });

  it("defaults reconnectEnabled to true when not explicitly passed", async () => {
    const client = buildClient();
    const manager = new MetaTrader5ConnectionManager(client, errorMapper, 3);

    await manager.autoReconnect();

    expect(client.reconnect).toHaveBeenCalledTimes(1);
  });
});
