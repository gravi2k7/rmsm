import { envSchema, type Env } from "./env.schema";

let cached: Env | null = null;

export function loadConfig(): Env {
  if (cached) return cached;

  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");

    throw new Error(`Invalid environment configuration:\n${issues}`);
  }

  cached = parsed.data;
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

export type { Env } from "./env.schema";