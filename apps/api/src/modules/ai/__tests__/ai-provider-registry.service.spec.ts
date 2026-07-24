import { AiProviderRegistryService } from "../registry/ai-provider-registry.service";
import { ProviderNotFoundError, ProviderDisabledError } from "../errors/ai-gateway.errors";
import type { AiProvider } from "../interfaces/ai-provider.interface";

function buildProvider(type: string, enabled: boolean): AiProvider {
  return {
    type,
    enabled,
    chat: jest.fn(),
    stream: jest.fn(),
    embed: jest.fn(),
    moderate: jest.fn(),
    healthCheck: jest.fn(),
    countTokens: jest.fn(),
    supportedModels: () => ["model-a"],
    capabilities: () => ({ chat: true, streaming: true, embedding: true, moderation: true, maxContextTokens: 8192, supportsFunctionCalling: false }),
  };
}

describe("AiProviderRegistryService", () => {
  let registry: AiProviderRegistryService;

  beforeEach(() => {
    registry = new AiProviderRegistryService();
  });

  it("registers and retrieves a real enabled provider", () => {
    const provider = buildProvider("openai", true);
    registry.register(provider);
    expect(registry.get("openai")).toBe(provider);
  });

  it("throws ProviderNotFoundError for an unregistered type", () => {
    expect(() => registry.get("anthropic")).toThrow(ProviderNotFoundError);
  });

  it("throws ProviderDisabledError for a registered but disabled provider — not silently returning it", () => {
    registry.register(buildProvider("openai", false));
    expect(() => registry.get("openai")).toThrow(ProviderDisabledError);
  });

  it("tryGet returns null (never throws) for an unregistered type", () => {
    expect(registry.tryGet("anthropic")).toBeNull();
  });

  it("tryGet returns a disabled provider without throwing — the caller decides what to do", () => {
    const provider = buildProvider("openai", false);
    registry.register(provider);
    expect(registry.tryGet("openai")).toBe(provider);
  });

  it("listEnabled excludes disabled providers", () => {
    registry.register(buildProvider("openai", true));
    registry.register(buildProvider("ollama", false));
    expect(registry.listEnabled()).toEqual(["openai"]);
  });

  it("listAll includes every registered provider regardless of enabled state", () => {
    registry.register(buildProvider("openai", true));
    registry.register(buildProvider("ollama", false));
    expect(registry.listAll().map((p) => p.type).sort()).toEqual(["ollama", "openai"]);
  });

  it("findByCapability only considers enabled providers matching the predicate", () => {
    const enabledWithChat = buildProvider("openai", true);
    const disabledWithChat = buildProvider("ollama", false);
    registry.register(enabledWithChat);
    registry.register(disabledWithChat);
    const found = registry.findByCapability((p) => p.capabilities().chat);
    expect(found).toEqual([enabledWithChat]);
  });
});
