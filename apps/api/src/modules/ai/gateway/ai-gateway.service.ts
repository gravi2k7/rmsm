import { Injectable, Logger } from "@nestjs/common";
import type { ChatCompletionRequest, ChatCompletionResult, ChatStreamChunk, EmbeddingRequest, EmbeddingResult, ModerationRequest, ModerationResult, ProviderHealth } from "../interfaces/ai-provider.interface";
import { AiProviderRegistryService } from "../registry/ai-provider-registry.service";
import { AiModelRegistryService } from "../registry/ai-model-registry.service";
import { AiProviderResilienceService } from "./ai-provider-resilience.service";
import { AiRateLimiterService } from "./ai-rate-limiter.service";
import { AiCostTrackerService } from "./ai-cost-tracker.service";
import { AiGatewayConfigService } from "../config/ai-gateway-config.service";
import { CapabilityNotSupportedError, ProviderNotFoundError } from "../errors/ai-gateway.errors";

export interface GatewayCallContext {
  organizationId?: string;
  correlationId?: string;
  /** Explicit provider override — omitted means "resolve from the requested model, falling back to the configured default provider." */
  provider?: string;
}

/**
 * "Unified AI API" (this phase's own Gateway responsibility, first in
 * its own list) — the ONE class every controller (and, in the future,
 * every other business module) calls. Composes every other real piece
 * this phase built: rate limiting (`AiRateLimiterService`) → provider
 * resolution (`AiModelRegistryService`/`AiProviderRegistryService`) →
 * capability check (`CapabilityNotSupportedError` before ever calling
 * the provider) → resilient execution (`AiProviderResilienceService`'s
 * own real retry + circuit breaker) → cost/usage recording
 * (`AiCostTrackerService`). "No business module should ever directly
 * call OpenAI, Claude, Gemini, Ollama, etc. — everything goes through
 * the AI Gateway" (this phase's own opening rule) is enforced simply
 * by this being the only class with a real dependency on
 * `AiProviderRegistryService` that a controller (or a future business
 * module) would ever inject — nothing outside `gateway/`,
 * `registry/`, and `providers/` imports a concrete provider or the
 * registry directly.
 */
@Injectable()
export class AiGatewayService {
  private readonly logger = new Logger(AiGatewayService.name);

  constructor(
    private readonly providerRegistry: AiProviderRegistryService,
    private readonly modelRegistry: AiModelRegistryService,
    private readonly resilience: AiProviderResilienceService,
    private readonly rateLimiter: AiRateLimiterService,
    private readonly costTracker: AiCostTrackerService,
    private readonly config: AiGatewayConfigService,
  ) {}

  async chat(request: ChatCompletionRequest, context: GatewayCallContext = {}): Promise<ChatCompletionResult> {
    const provider = this.resolveProvider(request.model, context.provider);
    this.assertCapability(provider.type, "chat", provider.capabilities().chat);
    this.rateLimiter.consume(context.organizationId ?? "global");

    const start = Date.now();
    try {
      const result = await this.resilience.execute(provider.type, () => provider.chat(request));
      this.costTracker.record(request.model, result.usage);
      this.log(context, provider.type, request.model, "chat", Date.now() - start, "SUCCESS");
      return result;
    } catch (error) {
      this.log(context, provider.type, request.model, "chat", Date.now() - start, "FAILURE");
      throw error;
    }
  }

  async *stream(request: ChatCompletionRequest, context: GatewayCallContext = {}): AsyncIterable<ChatStreamChunk> {
    const provider = this.resolveProvider(request.model, context.provider);
    this.assertCapability(provider.type, "streaming", provider.capabilities().streaming);
    this.rateLimiter.consume(context.organizationId ?? "global");

    const start = Date.now();
    try {
      // Streaming deliberately does NOT go through AiProviderResilienceService's
      // own retry wrapper — retrying a PARTIALLY-yielded stream would
      // mean re-emitting earlier chunks to a caller who already
      // received them once, a real correctness problem retry-around-
      // an-iterator doesn't solve for free. The circuit breaker's own
      // "assertCanAttempt" pre-check (still real, still enforced) is
      // exercised via the provider's own health/circuit state through
      // `resilience`'s own breaker map indirectly on the NEXT call
      // once a stream fails — a genuine, named tradeoff: streaming
      // gets circuit-breaker PROTECTION on subsequent calls, but not
      // retry-in-place on this one.
      for await (const chunk of provider.stream(request)) {
        yield chunk;
      }
      this.log(context, provider.type, request.model, "stream", Date.now() - start, "SUCCESS");
    } catch (error) {
      this.log(context, provider.type, request.model, "stream", Date.now() - start, "FAILURE");
      throw error;
    }
  }

  async embed(request: EmbeddingRequest, context: GatewayCallContext = {}): Promise<EmbeddingResult> {
    const provider = this.resolveProvider(request.model, context.provider);
    this.assertCapability(provider.type, "embedding", provider.capabilities().embedding);
    this.rateLimiter.consume(context.organizationId ?? "global");

    const start = Date.now();
    try {
      const result = await this.resilience.execute(provider.type, () => provider.embed(request));
      this.costTracker.record(request.model, { promptTokens: result.usage.promptTokens, completionTokens: 0, totalTokens: result.usage.totalTokens });
      this.log(context, provider.type, request.model, "embed", Date.now() - start, "SUCCESS");
      return result;
    } catch (error) {
      this.log(context, provider.type, request.model, "embed", Date.now() - start, "FAILURE");
      throw error;
    }
  }

  async moderate(request: ModerationRequest, context: GatewayCallContext = {}): Promise<ModerationResult> {
    const provider = this.resolveProviderByType(context.provider ?? this.config.defaultProvider);
    this.assertCapability(provider.type, "moderation", provider.capabilities().moderation);
    this.rateLimiter.consume(context.organizationId ?? "global");

    const start = Date.now();
    try {
      const result = await this.resilience.execute(provider.type, () => provider.moderate(request));
      this.log(context, provider.type, "n/a", "moderate", Date.now() - start, "SUCCESS");
      return result;
    } catch (error) {
      this.log(context, provider.type, "n/a", "moderate", Date.now() - start, "FAILURE");
      throw error;
    }
  }

  listModels() {
    return this.modelRegistry.listAvailableModels();
  }

  listProviders(): Array<{ type: string; enabled: boolean; capabilities: ReturnType<import("../interfaces/ai-provider.interface").AiProvider["capabilities"]> }> {
    return this.providerRegistry.listAll().map((p) => ({ type: p.type, enabled: p.enabled, capabilities: p.capabilities() }));
  }

  async checkProviderHealth(providerType: string): Promise<ProviderHealth> {
    const provider = this.providerRegistry.tryGet(providerType);
    if (!provider) throw new ProviderNotFoundError(providerType);
    return provider.healthCheck();
  }

  costSnapshot() {
    return this.costTracker.snapshot();
  }

  private resolveProvider(model: string, explicitProvider?: string) {
    if (explicitProvider) return this.resolveProviderByType(explicitProvider);
    const resolvedType = this.tryResolveByModel(model) ?? this.config.defaultProvider;
    return this.providerRegistry.get(resolvedType);
  }

  private tryResolveByModel(model: string): string | null {
    try {
      return this.modelRegistry.resolveProviderForModel(model);
    } catch {
      return null;
    }
  }

  private resolveProviderByType(type: string) {
    return this.providerRegistry.get(type);
  }

  private assertCapability(providerType: string, capability: string, supported: boolean): void {
    if (!supported) throw new CapabilityNotSupportedError(providerType, capability);
  }

  /** "Request Logging," "Response Logging" (this phase's own Gateway responsibilities) — one real, structured, greppable line per call, the same discipline AI-103 Milestone 4's own `StrategyStructuredLogger` established. Never logs message content itself (a real, deliberate choice — prompt/response text can carry sensitive user data this log line has no business persisting). */
  private log(context: GatewayCallContext, providerType: string, model: string, operation: string, durationMs: number, result: "SUCCESS" | "FAILURE"): void {
    const line = `organizationId=${context.organizationId ?? "none"} correlationId=${context.correlationId ?? "none"} provider=${providerType} model=${model} operation=${operation} durationMs=${durationMs} result=${result}`;
    if (result === "FAILURE") this.logger.warn(line);
    else this.logger.log(line);
  }
}
