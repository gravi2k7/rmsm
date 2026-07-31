import { MetaTrader5HealthProvider } from "../metatrader5.health";
import { MetaTrader5ErrorMapper } from "../metatrader5.error-mapper";
import type { MetaTrader5Client } from "../metatrader5.client";
import type { MetaTrader5SessionManager } from "../metatrader5.session-manager";

function buildClient(overrides: Partial<MetaTrader5Client> = {}): MetaTrader5Client {
  return {
    ping: jest.fn().mockResolvedValue({ connected: true, latencyMs: 5, terminalAvailable: true }),
    isConnected: jest.fn().mockReturnValue(true),
    ...overrides,
  } as unknown as MetaTrader5Client;
}

function buildSessionManager(isSessionValid = true): MetaTrader5SessionManager {
  return { isSessionValid: jest.fn().mockReturnValue(isSessionValid) } as unknown as MetaTrader5SessionManager;
}

describe("MetaTrader5HealthProvider", () => {
  let errorMapper: MetaTrader5ErrorMapper;

  beforeEach(() => {
    errorMapper = new MetaTrader5ErrorMapper();
  });

  it("reports healthy when connected, session valid, and terminal available", async () => {
    const health = new MetaTrader5HealthProvider(buildClient(), buildSessionManager(true), errorMapper);

    const snapshot = await health.checkHealth();

    expect(snapshot).toMatchObject({ status: "healthy", connected: true, sessionValid: true });
    expect(snapshot.latencyMs).toBeGreaterThanOrEqual(0);
    expect(snapshot.lastCheckedAt).toBeInstanceOf(Date);
  });

  it("reports degraded when connected but the session is not valid", async () => {
    const health = new MetaTrader5HealthProvider(buildClient(), buildSessionManager(false), errorMapper);

    const snapshot = await health.checkHealth();

    expect(snapshot.status).toBe("degraded");
    expect(snapshot.sessionValid).toBe(false);
  });

  it("reports down when the terminal is not available even if ping otherwise succeeds", async () => {
    const client = buildClient({ ping: jest.fn().mockResolvedValue({ connected: true, latencyMs: 5, terminalAvailable: false }) });
    const health = new MetaTrader5HealthProvider(client, buildSessionManager(true), errorMapper);

    const snapshot = await health.checkHealth();

    expect(snapshot.status).toBe("down");
  });

  it("reports down when isConnected() is false even if ping resolves", async () => {
    const client = buildClient({ isConnected: jest.fn().mockReturnValue(false) });
    const health = new MetaTrader5HealthProvider(client, buildSessionManager(true), errorMapper);

    const snapshot = await health.checkHealth();

    expect(snapshot.status).toBe("down");
    expect(snapshot.connected).toBe(false);
  });

  it("never throws — reports down/degraded with a message when ping() rejects", async () => {
    const client = buildClient({ ping: jest.fn().mockRejectedValue({ isBrokerOffline: true }) });
    const health = new MetaTrader5HealthProvider(client, buildSessionManager(true), errorMapper);

    const snapshot = await health.checkHealth();

    expect(snapshot.status).toBe("down");
    expect(snapshot.connected).toBe(false);
    expect(snapshot.message).toContain("broker_offline");
  });

  it("classifies a timeout ping failure as degraded, not down", async () => {
    const client = buildClient({ ping: jest.fn().mockRejectedValue({ isTimeout: true }) });
    const health = new MetaTrader5HealthProvider(client, buildSessionManager(true), errorMapper);

    expect((await health.checkHealth()).status).toBe("degraded");
  });

  it("classifies an unrecognized failure as unknown", async () => {
    const client = buildClient({ ping: jest.fn().mockRejectedValue(new Error("boom")) });
    const health = new MetaTrader5HealthProvider(client, buildSessionManager(true), errorMapper);

    expect((await health.checkHealth()).status).toBe("unknown");
  });
});
