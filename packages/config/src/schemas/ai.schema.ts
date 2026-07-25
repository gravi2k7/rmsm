import { z } from "zod";
import { port } from "../env/env.parser";

/**
 * AI platform configuration.
 * Includes both the internal AI service and AI Gateway configuration.
 */
export const aiSchema = z.object({
  // Internal AI service
  AI_SERVICE_URL: z.string().url().default("http://localhost:8000"),
  AI_SERVICE_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  AI_PORT: port(8000),

  // ===== AI Gateway =====

  AI_GATEWAY_DEFAULT_PROVIDER: z.string().default("ollama"),

  AI_GATEWAY_DEFAULT_CHAT_MODEL: z
    .string()
    .default("llama3"),

  AI_GATEWAY_DEFAULT_EMBED_MODEL: z
    .string()
    .default("llama3"),

  AI_GATEWAY_FALLBACK_PROVIDER: z
    .string()
    .optional(),

  AI_GATEWAY_CIRCUIT_FAILURE_THRESHOLD: z
    .coerce
    .number()
    .int()
    .positive()
    .default(5),

  AI_GATEWAY_CIRCUIT_COOLDOWN_MS: z
    .coerce
    .number()
    .int()
    .positive()
    .default(30000),

  AI_GATEWAY_MAX_RETRIES: z
    .coerce
    .number()
    .int()
    .min(0)
    .default(2),

  AI_GATEWAY_RETRY_BASE_DELAY_MS: z
    .coerce
    .number()
    .int()
    .positive()
    .default(300),

  AI_GATEWAY_REQUEST_TIMEOUT_MS: z
    .coerce
    .number()
    .int()
    .positive()
    .default(30000),

  AI_GATEWAY_RATE_LIMIT_PER_MINUTE: z
    .coerce
    .number()
    .int()
    .positive()
    .default(60),

  OPENAI_BASE_URL: z
    .string()
    .default("https://api.openai.com/v1"),

  OLLAMA_BASE_URL: z
    .string()
    .default("http://localhost:11434"),
});

export type AiEnv = z.infer<typeof aiSchema>;