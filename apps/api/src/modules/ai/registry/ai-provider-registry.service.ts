import { Injectable } from "@nestjs/common";
import type { AiProvider } from "../interfaces/ai-provider.interface";
import { ProviderNotFoundError, ProviderDisabledError } from "../errors/ai-gateway.errors";

/**
 * The real implementation of "Provider Registry" (this phase's own
 * Gateway responsibility) — the exact same `Map`-backed
 * register/get/tryGet/listEnabled shape AI-101's own
 * `ProviderRegistryService` (`market-data/providers/provider-registry.service.ts`)
 * already established and proved out. Registering a new provider type
 * (Anthropic, Gemini, Azure OpenAI, vLLM, NVIDIA NIM, HuggingFace TGI)
 * never requires editing this class — implement `AiProvider`, register
 * it from a real `OnModuleInit` (`providers/provider-registrar.service.ts`),
 * done.
 */
@Injectable()
export class AiProviderRegistryService {
  private readonly providers = new Map<string, AiProvider>();

  register(provider: AiProvider): void {
    this.providers.set(provider.type, provider);
  }

  get(type: string): AiProvider {
    const provider = this.providers.get(type);
    if (!provider) throw new ProviderNotFoundError(type);
    if (!provider.enabled) throw new ProviderDisabledError(type);
    return provider;
  }

  tryGet(type: string): AiProvider | null {
    return this.providers.get(type) ?? null;
  }

  listEnabled(): string[] {
    return [...this.providers.values()].filter((p) => p.enabled).map((p) => p.type);
  }

  listAll(): AiProvider[] {
    return [...this.providers.values()];
  }

  findByCapability(predicate: (provider: AiProvider) => boolean): AiProvider[] {
    return [...this.providers.values()].filter((p) => p.enabled && predicate(p));
  }
}
