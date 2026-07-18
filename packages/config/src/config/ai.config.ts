import { loadConfig } from "../env/env.loader";
import type { Env } from "../env/env.validator";

export interface AiConfig {
  readonly serviceUrl: string;
  readonly serviceApiKey?: string;
  readonly openaiApiKey?: string;
  readonly port: number;
}

export function getAiConfig(env: Env = loadConfig()): AiConfig {
  return {
    serviceUrl: env.AI_SERVICE_URL,
    serviceApiKey: env.AI_SERVICE_API_KEY,
    openaiApiKey: env.OPENAI_API_KEY,
    port: env.AI_PORT,
  };
}
