import { z } from "zod";

/**
 * Every environment variable any Node app in RMSM AI is allowed to read.
 * No app should read process.env directly — always go through loadConfig().
 * Adding a new env var means adding it here first.
 */
export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "staging", "production"]).default("development"),
  APP_ENV: z.enum(["local", "development", "staging", "production"]).default("local"),

  // Database
  DATABASE_URL: z.string().url().or(z.string().startsWith("postgresql://")),

  // Redis
  REDIS_URL: z.string().startsWith("redis://"),

  // Auth
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_ACCESS_TTL: z.string().default("15m"),
  JWT_REFRESH_TTL: z.string().default("7d"),

  // AI service
  AI_SERVICE_URL: z.string().url().default("http://localhost:8000"),
  AI_SERVICE_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),

  // Ports
  API_PORT: z.coerce.number().default(3001),
  WEB_PORT: z.coerce.number().default(3000),
  ADMIN_PORT: z.coerce.number().default(3002),
  AI_PORT: z.coerce.number().default(8000),

  // Rate limiting
  RATE_LIMIT_TTL_MS: z.coerce.number().default(60000),
  RATE_LIMIT_MAX: z.coerce.number().default(100),
});

export type Env = z.infer<typeof envSchema>;
