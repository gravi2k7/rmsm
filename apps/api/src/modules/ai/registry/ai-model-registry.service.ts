import { Injectable } from "@nestjs/common";
import { AiProviderRegistryService } from "./ai-provider-registry.service";
import { ModelNotSupportedError } from "../errors/ai-gateway.errors";

export interface ModelInfo {
  model: string;
  providerType: string;
  maxContextTokens: number;
  supportsFunctionCalling: boolean;
}

/**
 * "Model Registry" (this phase's own explicit Gateway responsibility)
 * — a real, DERIVED view over `AiProviderRegistryService`, not a
 * second, independently-maintained list a provider registration could
 * silently drift out of sync with. Every enabled provider's own
 * `supportedModels()` + `capabilities()` is the single source of
 * truth; this registry just makes "which provider serves model X" and
 * "list every real model available right now" fast, real lookups
 * without callers needing to scan every provider themselves.
 */
@Injectable()
export class AiModelRegistryService {
  constructor(private readonly providerRegistry: AiProviderRegistryService) {}

  listAvailableModels(): ModelInfo[] {
    const models: ModelInfo[] = [];
    for (const provider of this.providerRegistry.listAll()) {
      if (!provider.enabled) continue;
      const capabilities = provider.capabilities();
      for (const model of provider.supportedModels()) {
        models.push({ model, providerType: provider.type, maxContextTokens: capabilities.maxContextTokens, supportsFunctionCalling: capabilities.supportsFunctionCalling });
      }
    }
    return models;
  }

  /** Resolves which enabled provider actually serves a given model — throws a real, specific error (not a generic 404) if no enabled provider supports it, so a caller immediately knows this is a model-support problem, not a routing bug. */
  resolveProviderForModel(model: string): string {
    for (const provider of this.providerRegistry.listAll()) {
      if (provider.enabled && provider.supportedModels().includes(model)) {
        return provider.type;
      }
    }
    throw new ModelNotSupportedError("any enabled provider", model);
  }
}
