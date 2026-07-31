import { MetaTrader5SessionManager } from "../metatrader5.session-manager";
import type { MetaTrader5Client } from "../metatrader5.client";
import type { BrokerCredentials } from "../../../interfaces/broker-models";

const CREDENTIALS: BrokerCredentials = { login: "12345", password: "super-secret", server: "Demo-Server" };

function buildClient(overrides: Partial<MetaTrader5Client> = {}): MetaTrader5Client {
  return {
    login: jest.fn().mockResolvedValue({ sessionId: "sess-1", accountNumber: "12345", server: "Demo-Server", connectedAt: "2026-01-01T00:00:00.000Z" }),
    logout: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as MetaTrader5Client;
}

describe("MetaTrader5SessionManager", () => {
  it("login() stores a normalized BrokerSession and getSession() returns it", async () => {
    const manager = new MetaTrader5SessionManager(buildClient());

    const session = await manager.login(CREDENTIALS);

    expect(session.sessionId).toBe("sess-1");
    expect(session.connectedAt).toBeInstanceOf(Date);
    expect(manager.getSession()).toEqual(session);
  });

  it("isSessionValid() is false before any login", () => {
    const manager = new MetaTrader5SessionManager(buildClient());
    expect(manager.isSessionValid()).toBe(false);
  });

  it("isSessionValid() is true after login with no expiresAt", async () => {
    const manager = new MetaTrader5SessionManager(buildClient());
    await manager.login(CREDENTIALS);
    expect(manager.isSessionValid()).toBe(true);
  });

  it("isSessionValid() is false once expiresAt has passed", async () => {
    const client = buildClient({
      login: jest
        .fn()
        .mockResolvedValue({ sessionId: "sess-1", accountNumber: "12345", server: "Demo-Server", connectedAt: "2020-01-01T00:00:00.000Z", expiresAt: "2020-01-01T00:00:01.000Z" }),
    });
    const manager = new MetaTrader5SessionManager(client);

    await manager.login(CREDENTIALS);

    expect(manager.isSessionValid()).toBe(false);
  });

  it("logout() clears the session", async () => {
    const manager = new MetaTrader5SessionManager(buildClient());
    await manager.login(CREDENTIALS);

    await manager.logout();

    expect(manager.getSession()).toBeUndefined();
    expect(manager.isSessionValid()).toBe(false);
  });

  it("refreshSession() re-logs-in with the last-used credentials", async () => {
    const client = buildClient();
    const manager = new MetaTrader5SessionManager(client);
    await manager.login(CREDENTIALS);

    await manager.refreshSession();

    expect(client.login).toHaveBeenCalledTimes(2);
    expect(client.login).toHaveBeenLastCalledWith(CREDENTIALS);
  });

  it("refreshSession() throws isSessionExpired when there was never a prior login", async () => {
    const manager = new MetaTrader5SessionManager(buildClient());

    await expect(manager.refreshSession()).rejects.toMatchObject({ isSessionExpired: true });
  });

  it("refreshSession() fails after logout (no credentials to reuse)", async () => {
    const manager = new MetaTrader5SessionManager(buildClient());
    await manager.login(CREDENTIALS);
    await manager.logout();

    await expect(manager.refreshSession()).rejects.toMatchObject({ isSessionExpired: true });
  });
});
