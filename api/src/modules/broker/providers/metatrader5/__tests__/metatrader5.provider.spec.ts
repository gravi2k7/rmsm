import { MetaTrader5Provider } from "../metatrader5.provider";
import { MT5_TIMEFRAMES } from "../metatrader5.constants";
import type { MetaTrader5SessionManager } from "../metatrader5.session-manager";
import type { BrokerCredentials } from "../../../interfaces/broker-models";

function buildProvider(enabled = true) {
  const sessionManager = {
    login: jest.fn().mockResolvedValue({ sessionId: "s1", accountNumber: "1", server: "Demo", connectedAt: new Date() }),
    logout: jest.fn().mockResolvedValue(undefined),
    isSessionValid: jest.fn().mockReturnValue(true),
    getSession: jest.fn().mockReturnValue(undefined),
  } as unknown as MetaTrader5SessionManager;

  const provider = new MetaTrader5Provider(
    enabled,
    {} as never, // errorMapper
    {} as never, // healthProvider
    {} as never, // accountService
    {} as never, // symbolService
    {} as never, // marketService
    {} as never, // orderService
    {} as never, // positionService
    {} as never, // historyService
    {} as never, // streamingService
    {} as never, // riskService
    sessionManager,
    {} as never, // connectionManager
  );

  return { provider, sessionManager };
}

describe("MetaTrader5Provider", () => {
  it("implements BrokerProvider with type METATRADER5 and BR-001's own metadata capability flags", () => {
    const { provider } = buildProvider();

    expect(provider.type).toBe("METATRADER5");
    expect(provider.metadata).toMatchObject({
      name: "MetaTrader 5",
      brokerType: "METATRADER5",
      supportsStreaming: true,
      supportsOrderExecution: true,
      supportsPositions: true,
      supportsHistory: true,
      supportsRiskManagement: true,
    });
  });

  it("enabled reflects the enabledFlag constructor argument, driven by MT5_ENABLED", () => {
    expect(buildProvider(true).provider.enabled).toBe(true);
    expect(buildProvider(false).provider.enabled).toBe(false);
  });

  it("supportedTimeframes exposes BR-001's own 9 named timeframes", () => {
    const { provider } = buildProvider();
    expect(provider.supportedTimeframes).toEqual(MT5_TIMEFRAMES);
  });

  it("authService.login()/logout()/isAuthenticated()/getSession() delegate to the injected MetaTrader5SessionManager", async () => {
    const { provider, sessionManager } = buildProvider();
    const credentials: BrokerCredentials = { login: "1", password: "secret", server: "Demo" };

    await provider.authService.login(credentials);
    expect(sessionManager.login).toHaveBeenCalledWith(credentials);

    await provider.authService.logout();
    expect(sessionManager.logout).toHaveBeenCalledTimes(1);

    expect(provider.authService.isAuthenticated()).toBe(true);
    expect(sessionManager.isSessionValid).toHaveBeenCalledTimes(1);

    provider.authService.getSession();
    expect(sessionManager.getSession).toHaveBeenCalledTimes(1);
  });

  it("exposes every named sub-service constructor argument as a readonly property", () => {
    const { provider } = buildProvider();

    expect(provider.errorMapper).toBeDefined();
    expect(provider.healthProvider).toBeDefined();
    expect(provider.accountService).toBeDefined();
    expect(provider.symbolService).toBeDefined();
    expect(provider.marketService).toBeDefined();
    expect(provider.orderService).toBeDefined();
    expect(provider.positionService).toBeDefined();
    expect(provider.historyService).toBeDefined();
    expect(provider.streamingService).toBeDefined();
    expect(provider.riskService).toBeDefined();
    expect(provider.connectionManager).toBeDefined();
  });
});
