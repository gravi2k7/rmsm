import { loadConfig } from "../env/env.loader";
import type { Env } from "../env/env.validator";

export interface DatabaseConfig {
  readonly url: string;
  readonly redisUrl: string;
}

export function getDatabaseConfig(env: Env = loadConfig()): DatabaseConfig {
  return {
    url: env.DATABASE_URL,
    redisUrl: env.REDIS_URL,
  };
}
