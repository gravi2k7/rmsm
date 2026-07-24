import { AiProviderResilienceService } from "../gateway/ai-provider-resilience.service";
import { AiGatewayConfigService } from "../config/ai-gateway-config.service";
import { CircuitOpenError } from "../errors/ai-gateway.errors";

function buildResilience(overrides: Partial<{ maxRetries: number; retryBaseDelayMs: number; circuitFailureThreshold: number; circuitCooldownMs: number }> = {}): AiProviderResilienceService {
  const config = {
    maxRetries: overrides.maxRetries ?? 2,
    retryBaseDelayMs: overrides.retryBaseDelayMs ?? 1,
    circuitFailureThreshold: overrides.circuitFailureThreshold ?? 3,
    circuitCooldownMs: overrides.circuitCooldownMs ?? 50,
  } as unknown as AiGatewayConfigService;
  return new AiProviderResilienceService(config);
}

describe("AiProviderResilienceService — real retry with backoff, real per-provider circuit breaker", () => {
  it("returns the result immediately on first success — no retry needed", async () => {
    const resilience = buildResilience();
    const operation = jest.fn().mockResolvedValue("ok");
    const result = await resilience.execute("openai", operation);
    expect(result).toBe("ok");
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it("retries a failing operation up to maxRetries + 1 total attempts, then succeeds if a later attempt does", async () => {
    const resilience = buildResilience({ maxRetries: 2 });
    const operation = jest.fn().mockRejectedValueOnce(new Error("fail 1")).mockRejectedValueOnce(new Error("fail 2")).mockResolvedValueOnce("ok");
    const result = await resilience.execute("openai", operation);
    expect(result).toBe("ok");
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it("throws the last real error once every retry attempt is exhausted", async () => {
    const resilience = buildResilience({ maxRetries: 1 });
    const operation = jest.fn().mockRejectedValue(new Error("persistent failure"));
    await expect(resilience.execute("openai", operation)).rejects.toThrow("persistent failure");
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it("opens the circuit after enough consecutive failures, and short-circuits further calls with CircuitOpenError WITHOUT even attempting the operation", async () => {
    const resilience = buildResilience({ maxRetries: 0, circuitFailureThreshold: 2 });
    const operation = jest.fn().mockRejectedValue(new Error("down"));

    await expect(resilience.execute("openai", operation)).rejects.toThrow("down");
    await expect(resilience.execute("openai", operation)).rejects.toThrow("down");
    // Circuit should now be open — a 3rd call must fail fast as CircuitOpenError, without calling operation again.
    const callCountBeforeOpen = operation.mock.calls.length;
    await expect(resilience.execute("openai", operation)).rejects.toThrow(CircuitOpenError);
    expect(operation).toHaveBeenCalledTimes(callCountBeforeOpen);
  });

  it("maintains a SEPARATE circuit breaker per provider — one provider's own failures never open another's circuit", async () => {
    const resilience = buildResilience({ maxRetries: 0, circuitFailureThreshold: 1 });
    const failingOperation = jest.fn().mockRejectedValue(new Error("openai down"));
    const succeedingOperation = jest.fn().mockResolvedValue("ollama ok");

    await expect(resilience.execute("openai", failingOperation)).rejects.toThrow("openai down");
    // openai's circuit is now open; ollama's own circuit must be entirely unaffected.
    const result = await resilience.execute("ollama", succeedingOperation);
    expect(result).toBe("ollama ok");
  });
});
