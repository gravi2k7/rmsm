import { envSchema, type Env } from "./env.schema";

let cached: Env | null = null;

/**
 * Validates and returns process.env against envSchema.
 * Fails fast (throws) on boot if required vars are missing/invalid —
 * per the Twelve-Factor principle: never fail silently at runtime.
 */
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

export type { Env } from "./env.schema";
