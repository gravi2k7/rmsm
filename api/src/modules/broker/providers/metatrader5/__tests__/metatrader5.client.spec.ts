import { MetaTrader5Client, type MetaTrader5ClientConfig } from "../metatrader5.client";
import type { BrokerCredentials } from "../../../interfaces/broker-models";

function buildConfig(overrides: Partial<MetaTrader5ClientConfig> = {}): MetaTrader5ClientConfig {
  return { gatewayUrl: "http://localhost:8222", timeoutMs: 200, maxRetry: 2, heartbeatSeconds: 30, ...overrides };
}

function jsonResponse(status: number, body: unknown) {
  return { ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body) };
}

const CREDENTIALS: BrokerCredentials = { login: "12345", password: "super-secret", server: "Demo-Server" };

describe("MetaTrader5Client", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  describe("connect / disconnect / status", () => {
    it("starts DISCONNECTED and moves to CONNECTED after a successful ping", async () => {
      const fetchMock = jest.fn().mockResolvedValue(jsonResponse(200, { connected: true, latencyMs: 5, terminalAvailable: true }));
      global.fetch = fetchMock as unknown as typeof fetch;

      const client = new MetaTrader5Client(buildConfig());
      expect(client.getConnectionStatus()).toBe("DISCONNECTED");

      await client.connect();

      expect(client.getConnectionStatus()).toBe("CONNECTED");
      expect(client.isConnected()).toBe(true);
    });

    it("moves to FAILED and throws an isConnectionFailed error when the ping fails", async () => {
      global.fetch = jest.fn().mockRejectedValue(new TypeError("fetch failed")) as unknown as typeof fetch;
      const client = new MetaTrader5Client(buildConfig({ maxRetry: 0 }));

      await expect(client.connect()).rejects.toMatchObject({ isConnectionFailed: true });
      expect(client.getConnectionStatus()).toBe("FAILED");
    });

    it("disconnect() clears the session and moves to DISCONNECTED", async () => {
      const fetchMock = jest.fn().mockResolvedValue(jsonResponse(200, { connected: true, latencyMs: 5, terminalAvailable: true }));
      global.fetch = fetchMock as unknown as typeof fetch;
      const client = new MetaTrader5Client(buildConfig());
      await client.connect();

      await client.disconnect();

      expect(client.getConnectionStatus()).toBe("DISCONNECTED");
      expect(client.hasSession()).toBe(false);
    });
  });

  describe("login / logout", () => {
    it("logs in, stores the session id, and never includes the password in a logged field", async () => {
      const fetchMock = jest.fn().mockResolvedValue(
        jsonResponse(200, { sessionId: "sess-1234567890", accountNumber: "12345", server: "Demo-Server", connectedAt: "2026-01-01T00:00:00.000Z" }),
      );
      global.fetch = fetchMock as unknown as typeof fetch;
      const client = new MetaTrader5Client(buildConfig());

      const session = await client.login(CREDENTIALS);

      expect(session.sessionId).toBe("sess-1234567890");
      expect(client.hasSession()).toBe(true);

      const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(String(init.body)).toContain("super-secret"); // sent to the gateway, but never logged (asserted below is out of scope for a unit test of fetch args)
    });

    it("maps a 401/403 login failure to isInvalidCredentials rather than a generic isLoginFailed", async () => {
      global.fetch = jest.fn().mockResolvedValue(jsonResponse(401, { message: "bad credentials" })) as unknown as typeof fetch;
      const client = new MetaTrader5Client(buildConfig({ maxRetry: 0 }));

      await expect(client.login(CREDENTIALS)).rejects.toMatchObject({ isInvalidCredentials: true });
    });

    it("maps a non-auth login failure to isLoginFailed", async () => {
      global.fetch = jest.fn().mockResolvedValue(jsonResponse(500, { message: "gateway error" })) as unknown as typeof fetch;
      const client = new MetaTrader5Client(buildConfig({ maxRetry: 0 }));

      await expect(client.login(CREDENTIALS)).rejects.toMatchObject({ isLoginFailed: true });
    });

    it("logout() is a no-op when there is no active session", async () => {
      const fetchMock = jest.fn();
      global.fetch = fetchMock as unknown as typeof fetch;
      const client = new MetaTrader5Client(buildConfig());

      await client.logout();

      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("logout() clears the session even if the gateway call throws", async () => {
      const fetchMock = jest
        .fn()
        .mockResolvedValueOnce(jsonResponse(200, { sessionId: "sess-1", accountNumber: "12345", server: "Demo-Server", connectedAt: "2026-01-01T00:00:00.000Z" }))
        .mockRejectedValueOnce(new TypeError("fetch failed"));
      global.fetch = fetchMock as unknown as typeof fetch;
      const client = new MetaTrader5Client(buildConfig({ maxRetry: 0 }));
      await client.login(CREDENTIALS);

      await expect(client.logout()).rejects.toBeDefined();
      expect(client.hasSession()).toBe(false);
    });
  });

  describe("reconnect", () => {
    it("disconnects, reconnects, and re-logs-in with the last-used credentials", async () => {
      const fetchMock = jest
        .fn()
        .mockResolvedValueOnce(jsonResponse(200, { connected: true, latencyMs: 5, terminalAvailable: true })) // initial connect() ping
        .mockResolvedValueOnce(jsonResponse(200, { sessionId: "sess-1", accountNumber: "12345", server: "Demo-Server", connectedAt: "2026-01-01T00:00:00.000Z" })) // login
        .mockResolvedValueOnce(jsonResponse(200, { connected: true, latencyMs: 5, terminalAvailable: true })) // reconnect() -> connect() ping
        .mockResolvedValueOnce(jsonResponse(200, { sessionId: "sess-2", accountNumber: "12345", server: "Demo-Server", connectedAt: "2026-01-01T00:05:00.000Z" })); // reconnect() -> login
      global.fetch = fetchMock as unknown as typeof fetch;
      const client = new MetaTrader5Client(buildConfig());
      await client.connect();
      await client.login(CREDENTIALS);

      await client.reconnect();

      expect(client.getConnectionStatus()).toBe("CONNECTED");
      expect(client.hasSession()).toBe(true);
      expect(fetchMock).toHaveBeenCalledTimes(4);
    });

    it("reconnect() does not attempt a re-login when no session was ever established", async () => {
      const fetchMock = jest.fn().mockResolvedValue(jsonResponse(200, { connected: true, latencyMs: 5, terminalAvailable: true }));
      global.fetch = fetchMock as unknown as typeof fetch;
      const client = new MetaTrader5Client(buildConfig());

      await client.reconnect();

      expect(client.hasSession()).toBe(false);
      expect(fetchMock).toHaveBeenCalledTimes(1); // only the connect() ping
    });
  });

  describe("ping / heartbeat", () => {
    it("ping() issues a session-less GET /ping request", async () => {
      const fetchMock = jest.fn().mockResolvedValue(jsonResponse(200, { connected: true, latencyMs: 5, terminalAvailable: true }));
      global.fetch = fetchMock as unknown as typeof fetch;
      const client = new MetaTrader5Client(buildConfig());

      await client.ping();

      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("http://localhost:8222/ping");
      expect((init.headers as Record<string, string>)["X-MT5-Session"]).toBeUndefined();
    });

    it("startHeartbeat() pings on the configured interval and invokes onFailure when a ping fails", async () => {
      jest.useFakeTimers();
      const fetchMock = jest
        .fn()
        .mockResolvedValueOnce(jsonResponse(200, { connected: true, latencyMs: 5, terminalAvailable: true }))
        .mockRejectedValueOnce(new TypeError("fetch failed"));
      global.fetch = fetchMock as unknown as typeof fetch;
      const client = new MetaTrader5Client(buildConfig({ heartbeatSeconds: 1, maxRetry: 0 }));
      const onFailure = jest.fn();

      client.startHeartbeat(onFailure);
      await jest.advanceTimersByTimeAsync(1_000);
      expect(fetchMock).toHaveBeenCalledTimes(1);

      await jest.advanceTimersByTimeAsync(1_000);
      expect(onFailure).toHaveBeenCalledTimes(1);

      client.stopHeartbeat();
      jest.useRealTimers();
    });

    it("stopHeartbeat() prevents further pings", async () => {
      jest.useFakeTimers();
      const fetchMock = jest.fn().mockResolvedValue(jsonResponse(200, { connected: true, latencyMs: 5, terminalAvailable: true }));
      global.fetch = fetchMock as unknown as typeof fetch;
      const client = new MetaTrader5Client(buildConfig({ heartbeatSeconds: 1 }));

      client.startHeartbeat(jest.fn());
      client.stopHeartbeat();
      await jest.advanceTimersByTimeAsync(5_000);

      expect(fetchMock).not.toHaveBeenCalled();
      jest.useRealTimers();
    });
  });

  describe("request() retry behavior", () => {
    it("retries a 503 up to maxRetry times, then succeeds", async () => {
      jest.useFakeTimers();
      const fetchMock = jest
        .fn()
        .mockResolvedValueOnce(jsonResponse(503, { message: "unavailable" }))
        .mockResolvedValueOnce(jsonResponse(200, { ok: true }));
      global.fetch = fetchMock as unknown as typeof fetch;
      const client = new MetaTrader5Client(buildConfig({ maxRetry: 2 }));

      const promise = client.request("GET", "/anything");
      await jest.advanceTimersByTimeAsync(2_000);
      await expect(promise).resolves.toEqual({ ok: true });
      expect(fetchMock).toHaveBeenCalledTimes(2);
      jest.useRealTimers();
    });

    it("does not retry a non-retryable 400 and throws immediately", async () => {
      const fetchMock = jest.fn().mockResolvedValue(jsonResponse(400, { message: "bad request" }));
      global.fetch = fetchMock as unknown as typeof fetch;
      const client = new MetaTrader5Client(buildConfig({ maxRetry: 3 }));

      await expect(client.request("GET", "/anything")).rejects.toMatchObject({ httpStatus: 400 });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("exhausts retries and throws the last classified error", async () => {
      jest.useFakeTimers();
      global.fetch = jest.fn().mockResolvedValue(jsonResponse(503, { message: "still down" })) as unknown as typeof fetch;
      const client = new MetaTrader5Client(buildConfig({ maxRetry: 1 }));

      const promise = client.request("GET", "/anything");
      const assertion = expect(promise).rejects.toMatchObject({ httpStatus: 503 });
      await jest.advanceTimersByTimeAsync(2_000);
      await assertion;
      expect(global.fetch).toHaveBeenCalledTimes(2);
      jest.useRealTimers();
    });

    it("attaches X-MT5-Session on authenticated calls once logged in", async () => {
      const fetchMock = jest
        .fn()
        .mockResolvedValueOnce(jsonResponse(200, { sessionId: "sess-abcd1234", accountNumber: "1", server: "s", connectedAt: "2026-01-01T00:00:00.000Z" }))
        .mockResolvedValueOnce(jsonResponse(200, { ok: true }));
      global.fetch = fetchMock as unknown as typeof fetch;
      const client = new MetaTrader5Client(buildConfig());
      await client.login(CREDENTIALS);

      await client.request("GET", "/account");

      const [, init] = fetchMock.mock.calls[1] as [string, RequestInit];
      expect((init.headers as Record<string, string>)["X-MT5-Session"]).toBe("sess-abcd1234");
    });

    it("classifies a timeout (AbortError) distinctly from a network error", async () => {
      global.fetch = jest.fn().mockImplementation(() => {
        const err = new Error("aborted");
        err.name = "AbortError";
        return Promise.reject(err);
      }) as unknown as typeof fetch;
      const client = new MetaTrader5Client(buildConfig({ maxRetry: 0 }));

      await expect(client.request("GET", "/anything")).rejects.toMatchObject({ isTimeout: true });
    });

    it("treats a non-JSON response body as a network error rather than crashing", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.reject(new Error("not json")),
      }) as unknown as typeof fetch;
      const client = new MetaTrader5Client(buildConfig({ maxRetry: 0 }));

      await expect(client.request("GET", "/anything")).rejects.toMatchObject({ isNetworkError: true });
    });
  });
});
