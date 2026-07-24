import { AiProviderRegistryService } from "../registry/ai-provider-registry.service";
import { AiModelRegistryService } from "../registry/ai-model-registry.service";
import { ModelNotSupportedError } from "../errors/ai-gateway.errors";
import type { AiProvider } from "../interfaces/ai-provider.interface";

function buildProvider(type: string, enabled: boolean, models: string[]): AiProvider {
  return {
    type,
    enabled,
    chat: jest.fn(),
    stream: jest.fn(),
    embed: jest.fn(),
    moderate: jest.fn(),
    healthCheck: jest.fn(),
    countTokens: jest.fn(),
    supportedModels: () => models,
    capabilities: () => ({ chat: true, streaming: true, embedding: true, moderation: true, maxContextTokens: 8192, supportsFunctionCalling: false }),
  };
}

describe("AiModelRegistryService", () => {
  let providerRegistry: AiProviderRegistryService;
  let modelRegistry: AiModelRegistryService;

  beforeEach(() => {
    providerRegistry = new AiProviderRegistryService();
    modelRegistry = new AiModelRegistryService(providerRegistry);
  });

  it("lists every model from every enabled provider, real derived data — not a second, independently-maintained list", () => {
    providerRegistry.register(buildProvider("openai", true, ["gpt-4o", "gpt-4o-mini"]));
    providerRegistry.register(buildProvider("ollama", true, ["llama3"]));

    const models = modelRegistry.listAvailableModels();
    expect(models.map((m) => m.model).sort()).toEqual(["gpt-4o", "gpt-4o-mini", "llama3"]);
  });

  it("excludes models from disabled providers", () => {
    providerRegistry.register(buildProvider("openai", false, ["gpt-4o"]));
    expect(modelRegistry.listAvailableModels()).toEqual([]);
  });

  it("resolves the correct provider type for a given model", () => {
    providerRegistry.register(buildProvider("openai", true, ["gpt-4o"]));
    providerRegistry.register(buildProvider("ollama", true, ["llama3"]));
    expect(modelRegistry.resolveProviderForModel("llama3")).toBe("ollama");
  });

  it("throws ModelNotSupportedError when no enabled provider serves the requested model", () => {
    providerRegistry.register(buildProvider("openai", true, ["gpt-4o"]));
    expect(() => modelRegistry.resolveProviderForModel("claude-3")).toThrow(ModelNotSupportedError);
  });

  it("does not resolve a model that's only served by a DISABLED provider", () => {
    providerRegistry.register(buildProvider("openai", false, ["gpt-4o"]));
    expect(() => modelRegistry.resolveProviderForModel("gpt-4o")).toThrow(ModelNotSupportedError);
  });
});
