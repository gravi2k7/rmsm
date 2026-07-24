import { Injectable } from "@nestjs/common";
import { loadConfig } from "@rmsm/config";

/**
 * The requested `config/` folder, satisfied without inventing a
 * second configuration mechanism — this class is a thin, typed
 * accessor over `@rmsm/config`'s own centralized `loadConfig()`
 * (`env.schema.ts`'s own new AI Gateway keys, this phase's addition),
 * matching AI-103 Milestone 4's own established precedent for how a
 * module-specific config concern stays centralized rather than
 * reading `process.env` directly anywhere in a provider or the
 * gateway itself.
 */
@Injectable()
export class AiGatewayConfigService {
  get defaultProvider(): string {
    return loadConfig().AI_GATEWAY_DEFAULT_PROVIDER;
  }
  get defaultChatModel(): string {
    return loadConfig().AI_GATEWAY_DEFAULT_CHAT_MODEL;
  }
  get defaultEmbedModel(): string {
    return loadConfig().AI_GATEWAY_DEFAULT_EMBED_MODEL;
  }
  get fallbackProvider(): string | undefined {
    return loadConfig().AI_GATEWAY_FALLBACK_PROVIDER;
  }
  get circuitFailureThreshold(): number {
    return loadConfig().AI_GATEWAY_CIRCUIT_FAILURE_THRESHOLD;
  }
  get circuitCooldownMs(): number {
    return loadConfig().AI_GATEWAY_CIRCUIT_COOLDOWN_MS;
  }
  get maxRetries(): number {
    return loadConfig().AI_GATEWAY_MAX_RETRIES;
  }
  get retryBaseDelayMs(): number {
    return loadConfig().AI_GATEWAY_RETRY_BASE_DELAY_MS;
  }
  get requestTimeoutMs(): number {
    return loadConfig().AI_GATEWAY_REQUEST_TIMEOUT_MS;
  }
  get rateLimitPerMinute(): number {
    return loadConfig().AI_GATEWAY_RATE_LIMIT_PER_MINUTE;
  }
  get openAiApiKey(): string | undefined {
    return loadConfig().OPENAI_API_KEY;
  }
  get openAiBaseUrl(): string {
    return loadConfig().OPENAI_BASE_URL;
  }
  get ollamaBaseUrl(): string {
    return loadConfig().OLLAMA_BASE_URL;
  }
}
