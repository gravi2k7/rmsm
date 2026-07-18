import { z } from "zod";

/**
 * Logging and observability (OpenTelemetry tracing + structured-log
 * settings). `OTEL_EXPORTER_OTLP_ENDPOINT`/`OTEL_SERVICE_NAME` are
 * unchanged from the original flat `envSchema` — including its own
 * pre-existing caveat: `apps/api/src/tracing.ts` reads these two directly
 * via `process.env`, NOT via `loadConfig()`, because tracing must
 * initialize before any other import (including this config package) can
 * run. They're declared here anyway for documentation/discoverability
 * alongside every other configurable value, same as before.
 *
 * `LOG_LEVEL`/`LOG_FORMAT` are new — genuine, commonly-needed logging
 * config with no existing reader yet in `apps/api` (the platform's own
 * `winston.config.ts` currently branches on `NODE_ENV` directly rather
 * than a dedicated log-level var). Declared here so the next piece of
 * work that wants configurable log verbosity doesn't have to add the env
 * var from scratch — the same "declare ahead of first consumer" pattern
 * already used for the OTEL vars.
 */
export const loggingSchema = z.object({
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().optional(),
  OTEL_SERVICE_NAME: z.string().optional(),

  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  LOG_FORMAT: z.enum(["json", "pretty"]).default("json"),
});

export type LoggingEnv = z.infer<typeof loggingSchema>;
