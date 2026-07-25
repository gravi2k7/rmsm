import { validateEnv, type Env } from "./env/env.validator";

let cached: Env | null = null;

export function loadConfig(): Env {
  if (cached) return cached;

  cached = validateEnv(process.env);

  return cached;
}

export function resetConfigCache(): void {
  cached = null;
}

export function isProduction(env?: Env): boolean {
  const cfg = env ?? loadConfig();
  return cfg.NODE_ENV === "production";
}

export function isTest(env?: Env): boolean {
  const cfg = env ?? loadConfig();
  return cfg.NODE_ENV === "test";
}

export { ConfigValidationError } from "./types/config.types";

export type { Env } from "./env.schema";