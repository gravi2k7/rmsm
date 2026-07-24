import { AiGatewayService } from "../gateway/ai-gateway.service";
import { AiProviderRegistryService } from "../registry/ai-provider-registry.service";
import { AiModelRegistryService } from "../registry/ai-model-registry.service";
import { AiProviderResilienceService } from "../gateway/ai-provider-resilience.service";
import { AiRateLimiterService } from "../gateway/ai-rate-limiter.service";
import { AiCostTrackerService } from "../gateway/ai-cost-tracker.service";
import { AiGatewayConfigService } from "../config/ai-gateway-config.service";
import { CapabilityNotSupportedError, RateLimitExceededError } from "../errors/ai-gateway.errors";
import type { AiProvider } from "../interfaces/ai-provider.interface";

function buildProvider(overrides: Partial<AiProvider> = {}): AiProvider {
  return {
    type: "openai",
    enabled: true,
    chat: jest.fn().mockResolvedValue({ content: "hello", model: "gpt-4o-mini", finishReason: "stop", usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 } }),
    stream: jest.fn(),
    embed: jest.fn(),
    moderate: jest.fn(),
    healthCheck: jest.fn().mockResolvedValue({ healthy: true }),
    countTokens: jest.fn().mockReturnValue(1),
    supportedModels: () => ["gpt-4o-mini"],
    capabilities: () => ({ chat: true, streaming: true, embedding: true, moderation: true, maxContextTokens: 8192, supportsFunctionCalling: false }),
    ...overrides,
  };
}

function buildGateway(provider: AiProvider) {
  const providerRegistry = new AiProviderRegistryService();
  providerRegistry.register(provider);
  const modelRegistry = new AiModelRegistryService(providerRegistry);
  const config = { defaultProvider: "openai", rateLimitPerMinute: 1000, maxRetries: 0, retryBaseDelayMs: 1, circuitFailureThreshold: 5, circuitCooldownMs: 1000 } as unknown as AiGatewayConfigService;
  const resilience = new AiProviderResilienceService(config);
  const rateLimiter = new AiRateLimiterService(config);
  const costTracker = new AiCostTrackerService();
  const gateway = new AiGatewayService(providerRegistry, modelRegistry, resilience, rateLimiter, costTracker, config);
  return { gateway, providerRegistry, costTracker, rateLimiter };
}

describe("AiGatewayService — the real, unified orchestration entry point", () => {
  it("resolves the correct provider from the requested model and returns a real chat result", async () => {
    const provider = buildProvider();
    const { gateway } = buildGateway(provider);

    const result = await gateway.chat({ model: "gpt-4o-mini", messages: [{ role: "user", content: "hi" }] });

    expect(result.content).toBe("hello");
    expect(provider.chat).toHaveBeenCalled();
  });

  it("records real cost/usage after a successful chat call", async () => {
    const provider = buildProvider();
    const { gateway, costTracker } = buildGateway(provider);

    await gateway.chat({ model: "gpt-4o-mini", messages: [{ role: "user", content: "hi" }] });

    expect(costTracker.snapshot().totalRequests).toBe(1);
  });

  it("throws CapabilityNotSupportedError BEFORE calling the provider when the requested capability isn't supported — Model Capability Detection, made real", async () => {
    const provider = buildProvider({ capabilities: () => ({ chat: true, streaming: true, embedding: true, moderation: false, maxContextTokens: 8192, supportsFunctionCalling: false }) });
    const { gateway } = buildGateway(provider);

    await expect(gateway.moderate({ input: "test" }, { provider: "openai" })).rejects.toThrow(CapabilityNotSupportedError);
    expect(provider.moderate).not.toHaveBeenCalled();
  });

  it("enforces the rate limit before ever attempting a provider call", async () => {
    const provider = buildProvider();
    const providerRegistry = new AiProviderRegistryService();
    providerRegistry.register(provider);
    const modelRegistry = new AiModelRegistryService(providerRegistry);
    const config = { defaultProvider: "openai", rateLimitPerMinute: 1, maxRetries: 0, retryBaseDelayMs: 1, circuitFailureThreshold: 5, circuitCooldownMs: 1000 } as unknown as AiGatewayConfigService;
    const resilience = new AiProviderResilienceService(config);
    const rateLimiter = new AiRateLimiterService(config);
    const costTracker = new AiCostTrackerService();
    const gateway = new AiGatewayService(providerRegistry, modelRegistry, resilience, rateLimiter, costTracker, config);

    await gateway.chat({ model: "gpt-4o-mini", messages: [{ role: "user", content: "hi" }] });
    await expect(gateway.chat({ model: "gpt-4o-mini", messages: [{ role: "user", content: "hi" }] })).rejects.toThrow(RateLimitExceededError);
    expect(provider.chat).toHaveBeenCalledTimes(1);
  });

  it("respects an explicit provider override even when a different provider would normally serve the model", async () => {
    const openAiProvider = buildProvider({ type: "openai" });
    const ollamaProvider = buildProvider({ type: "ollama", supportedModels: () => ["llama3"] });
    const providerRegistry = new AiProviderRegistryService();
    providerRegistry.register(openAiProvider);
    providerRegistry.register(ollamaProvider);
    const modelRegistry = new AiModelRegistryService(providerRegistry);
    const config = { defaultProvider: "openai", rateLimitPerMinute: 1000, maxRetries: 0, retryBaseDelayMs: 1, circuitFailureThreshold: 5, circuitCooldownMs: 1000 } as unknown as AiGatewayConfigService;
    const resilience = new AiProviderResilienceService(config);
    const rateLimiter = new AiRateLimiterService(config);
    const costTracker = new AiCostTrackerService();
    const gateway = new AiGatewayService(providerRegistry, modelRegistry, resilience, rateLimiter, costTracker, config);

    await gateway.chat({ model: "gpt-4o-mini", messages: [{ role: "user", content: "hi" }] }, { provider: "ollama" });
    expect(ollamaProvider.chat).toHaveBeenCalled();
    expect(openAiProvider.chat).not.toHaveBeenCalled();
  });

  it("listModels() reflects real, currently-registered enabled providers, not a hardcoded list", () => {
    const provider = buildProvider();
    const { gateway } = buildGateway(provider);
    expect(gateway.listModels()).toEqual([{ model: "gpt-4o-mini", providerType: "openai", maxContextTokens: 8192, supportsFunctionCalling: false }]);
  });

  it("listProviders() reports real, current capabilities for every registered provider", () => {
    const provider = buildProvider();
    const { gateway } = buildGateway(provider);
    const providers = gateway.listProviders();
    expect(providers).toHaveLength(1);
    expect(providers[0]).toEqual(expect.objectContaining({ type: "openai", enabled: true }));
  });
});
