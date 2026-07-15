import { ProviderOrchestrationService } from "../provider-orchestration.service";
import type { ProviderRegistryService } from "../../providers/provider-registry.service";
import type { MarketDataMetricsService } from "../market-data-metrics.service";
import type { MarketDataProvider } from "../../interfaces/market-data-provider.interface";

describe("ProviderOrchestrationService", () => {
  function buildProvider(overrides: Partial<{ classify: jest.Mock; isRetryable: jest.Mock }> = {}) {
    const rateLimitPolicy = { getWaitTimeMs: jest.fn().mockResolvedValue(0), recordCall: jest.fn() };
    const errorMapper = {
      classify: overrides.classify ?? jest.fn().mockReturnValue("unknown"),
      isRetryable: overrides.isRetryable ?? jest.fn().mockReturnValue(false),
    };
    return { type: "POLYGON", enabled: true, rateLimitPolicy, errorMapper } as unknown as MarketDataProvider;
  }

  function buildService(provider: MarketDataProvider) {
    const registry = { get: jest.fn().mockReturnValue(provider) } as unknown as ProviderRegistryService;
    const metrics = { increment: jest.fn(), snapshot: jest.fn() } as unknown as MarketDataMetricsService;
    return { service: new ProviderOrchestrationService(registry, metrics), metrics };
  }

  it("returns the operation's result on the first successful call", async () => {
    const provider = buildProvider();
    const { service } = buildService(provider);
    const operation = jest.fn().mockResolvedValue("ok");

    const result = await service.executeWithRetry("POLYGON", operation, { baseBackoffMs: 1 });

    expect(result).toBe("ok");
    expect(operation).toHaveBeenCalledTimes(1);
    expect(provider.rateLimitPolicy.recordCall).toHaveBeenCalledTimes(1);
  });

  it("waits for the rate limit policy before calling the operation", async () => {
    const provider = buildProvider();
    (provider.rateLimitPolicy.getWaitTimeMs as jest.Mock).mockResolvedValue(5);
    const { service } = buildService(provider);
    const operation = jest.fn().mockResolvedValue("ok");

    await service.executeWithRetry("POLYGON", operation, { baseBackoffMs: 1 });

    expect(provider.rateLimitPolicy.getWaitTimeMs).toHaveBeenCalled();
    expect(operation).toHaveBeenCalled();
  });

  it("retries a retryable failure and succeeds on a later attempt", async () => {
    const provider = buildProvider({ isRetryable: jest.fn().mockReturnValue(true) });
    const { service, metrics } = buildService(provider);
    const operation = jest.fn().mockRejectedValueOnce(new Error("rate limited")).mockResolvedValueOnce("ok");

    const result = await service.executeWithRetry("POLYGON", operation, { baseBackoffMs: 1 });

    expect(result).toBe("ok");
    expect(operation).toHaveBeenCalledTimes(2);
    expect(metrics.increment).toHaveBeenCalledWith("provider.POLYGON.retry_succeeded");
  });

  it("does not retry a non-retryable failure — throws immediately", async () => {
    const provider = buildProvider({ isRetryable: jest.fn().mockReturnValue(false) });
    const { service } = buildService(provider);
    const operation = jest.fn().mockRejectedValue(new Error("auth failed"));

    await expect(service.executeWithRetry("POLYGON", operation, { baseBackoffMs: 1 })).rejects.toThrow("auth failed");
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it("gives up after exhausting maxRetries even for a retryable failure", async () => {
    const provider = buildProvider({ isRetryable: jest.fn().mockReturnValue(true) });
    const { service } = buildService(provider);
    const operation = jest.fn().mockRejectedValue(new Error("still failing"));

    await expect(service.executeWithRetry("POLYGON", operation, { maxRetries: 2, baseBackoffMs: 1 })).rejects.toThrow("still failing");
    expect(operation).toHaveBeenCalledTimes(3); // initial + 2 retries
  });

  it("records rateLimitPolicy.recordCall() on both success and failure", async () => {
    const provider = buildProvider({ isRetryable: jest.fn().mockReturnValue(false) });
    const { service } = buildService(provider);
    const operation = jest.fn().mockRejectedValue(new Error("x"));

    await expect(service.executeWithRetry("POLYGON", operation, { baseBackoffMs: 1 })).rejects.toThrow();
    expect(provider.rateLimitPolicy.recordCall).toHaveBeenCalledTimes(1);
  });

  it("fails with a timeout error when the operation hangs past timeoutMs", async () => {
    const provider = buildProvider({ isRetryable: jest.fn().mockReturnValue(false) });
    const { service } = buildService(provider);
    const operation = jest.fn().mockImplementation(() => new Promise(() => undefined)); // never resolves

    await expect(service.executeWithRetry("POLYGON", operation, { timeoutMs: 20, maxRetries: 0 })).rejects.toThrow("exceeded 20ms timeout");
  });

  it("getCircuitState starts closed for a provider that has never been called", () => {
    const provider = buildProvider();
    const { service } = buildService(provider);
    expect(service.getCircuitState("POLYGON")).toBe("closed");
  });

  it("opens the circuit after enough consecutive failures, independent of retry exhaustion within one call", async () => {
    const provider = buildProvider({ isRetryable: jest.fn().mockReturnValue(false) });
    const { service } = buildService(provider);
    const operation = jest.fn().mockRejectedValue(new Error("down"));

    // 5 separate calls, each failing once (non-retryable) — the circuit
    // breaker's failure threshold (5) is independent of any single
    // call's own retry count.
    for (let i = 0; i < 5; i++) {
      await expect(service.executeWithRetry("POLYGON", operation, { baseBackoffMs: 1 })).rejects.toThrow();
    }

    expect(service.getCircuitState("POLYGON")).toBe("open");
  });

  it("short-circuits immediately (without calling the operation) once the circuit is open", async () => {
    const provider = buildProvider({ isRetryable: jest.fn().mockReturnValue(false) });
    const { service } = buildService(provider);
    const operation = jest.fn().mockRejectedValue(new Error("down"));

    for (let i = 0; i < 5; i++) {
      await expect(service.executeWithRetry("POLYGON", operation, { baseBackoffMs: 1 })).rejects.toThrow();
    }
    operation.mockClear();

    await expect(service.executeWithRetry("POLYGON", operation, { baseBackoffMs: 1 })).rejects.toThrow("Circuit is open");
    expect(operation).not.toHaveBeenCalled();
  });
});
