import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";

// Config
import { AiGatewayConfigService } from "./config/ai-gateway-config.service";

// Registry
import { AiProviderRegistryService } from "./registry/ai-provider-registry.service";
import { AiModelRegistryService } from "./registry/ai-model-registry.service";

// Providers
import { OpenAiProvider } from "./providers/openai.provider";
import { OllamaProvider } from "./providers/ollama.provider";
import { AiProviderRegistrarService } from "./providers/provider-registrar.service";

// Gateway (orchestration)
import { AiGatewayService } from "./gateway/ai-gateway.service";
import { AiProviderResilienceService } from "./gateway/ai-provider-resilience.service";
import { AiRateLimiterService } from "./gateway/ai-rate-limiter.service";
import { AiCostTrackerService } from "./gateway/ai-cost-tracker.service";

// REST
import { AiGatewayController } from "./controllers/ai-gateway.controller";

/**
 * AI Phase 5.1, Milestone 1: AI-201 Gateway. "The AI Foundation
 * becomes the ONLY way every RMSM module communicates with AI" (this
 * phase's own opening rule) — this module `exports` only
 * `AiGatewayService` (never a provider, never the registry directly),
 * so any future business module that needs AI capability injects
 * exactly one class and never touches a concrete provider.
 *
 * Milestones 2-4 (AI-202 Prompt Platform, AI-203 Memory Platform,
 * AI-204 Observability Platform) are deliberately NOT built yet — this
 * phase's own proposed milestone breakdown, matching the discipline
 * every prior multi-part module in this platform has used. `chat()`
 * this milestone is fully STATELESS (a caller supplies the full
 * message array on every call) — persistent conversation state is
 * explicitly AI-203's own job, not something this milestone
 * approximates early.
 */
@Module({
  imports: [AuthModule],
  controllers: [AiGatewayController],
  providers: [
    AiGatewayConfigService,
    AiProviderRegistryService,
    AiModelRegistryService,
    OpenAiProvider,
    OllamaProvider,
    AiProviderRegistrarService,
    AiProviderResilienceService,
    AiRateLimiterService,
    AiCostTrackerService,
    AiGatewayService,
  ],
  exports: [AiGatewayService],
})
export class AiModule {}
