import { MetaTrader5ErrorMapper } from "../metatrader5.error-mapper";

describe("MetaTrader5ErrorMapper", () => {
  const mapper = new MetaTrader5ErrorMapper();

  it.each([
    [{ isInvalidCredentials: true }, "invalid_credentials"],
    [{ isLoginFailed: true }, "login_failed"],
    [{ isSessionExpired: true }, "session_expired"],
    [{ isSymbolNotFound: true }, "symbol_not_found"],
    [{ isOrderRejected: true }, "order_rejected"],
    [{ isBrokerOffline: true }, "broker_offline"],
    [{ isConnectionFailed: true }, "connection_failed"],
    [{ isTimeout: true }, "timeout"],
    [{ isNetworkError: true }, "network_error"],
  ] as const)("classifies %o as %s", (error, expected) => {
    expect(mapper.classify(error)).toBe(expected);
  });

  it("prioritizes isInvalidCredentials over every other flag when several are set", () => {
    expect(mapper.classify({ isInvalidCredentials: true, isTimeout: true, isNetworkError: true })).toBe("invalid_credentials");
  });

  it.each([
    [401, "invalid_credentials"],
    [403, "invalid_credentials"],
    [404, "symbol_not_found"],
    [408, "timeout"],
    [502, "broker_offline"],
    [503, "broker_offline"],
    [504, "broker_offline"],
    [500, "unknown"],
  ] as const)("falls back to httpStatus %d -> %s when no boolean flag is set", (httpStatus, expected) => {
    expect(mapper.classify({ httpStatus })).toBe(expected);
  });

  it("classifies a non-Mt5BrokerError value as unknown", () => {
    expect(mapper.classify(new Error("boom"))).toBe("unknown");
    expect(mapper.classify(null)).toBe("unknown");
    expect(mapper.classify("boom")).toBe("unknown");
  });

  it.each(["timeout", "network_error", "broker_offline", "connection_failed"] as const)("treats %s as retryable", (classification) => {
    expect(mapper.isRetryable(classification)).toBe(true);
  });

  it.each(["login_failed", "invalid_credentials", "order_rejected", "symbol_not_found", "session_expired", "unknown"] as const)(
    "does not treat %s as retryable",
    (classification) => {
      expect(mapper.isRetryable(classification)).toBe(false);
    },
  );
});
