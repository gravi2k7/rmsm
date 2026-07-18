import { loadConfig, isProduction, isTest } from "@rmsm/config";
import { BaseLogger } from "./logger";
import { ConsoleTransport } from "../transports/console.transport";
import { JsonTransport } from "../transports/json.transport";
import { PrettyFormatter } from "../formatters/pretty.formatter";
import { JsonFormatter } from "../formatters/json.formatter";
import type { Logger, LoggerOptions, LogLevel } from "../types/logger.types";

export interface CreateLoggerOptions extends LoggerOptions {
  /** Overrides environment-based transport selection — mainly for tests
   * that want deterministic, non-colored output regardless of NODE_ENV. */
  readonly forcePretty?: boolean;
  readonly forceJson?: boolean;
}

/**
 * Creates a root `Logger` with environment-appropriate defaults: pretty,
 * colorized console output in development, structured JSON on stdout in
 * production and staging (the "pretty logs in development" / "JSON logs
 * in production" requirement) — and quiet, uncolored pretty output in
 * `test` (readable if a test fails and its logs are inspected, without
 * ANSI codes cluttering CI output capture).
 *
 * Reads `NODE_ENV`/`LOG_LEVEL` from `@rmsm/config`'s own `loadConfig()` —
 * this package's one workspace dependency — rather than reading
 * `process.env` directly, so log configuration goes through the same
 * validated, fail-fast config path as everything else in the platform.
 */
export class LoggerFactory {
  static createLogger(options: CreateLoggerOptions = {}): Logger {
    const env = loadConfig();
    const level: LogLevel = options.level ?? env.LOG_LEVEL;

    const usePretty = options.forcePretty ?? (!options.forceJson && !isProduction(env) && env.APP_ENV !== "staging");

    const transports = options.transports ?? [
      usePretty
        ? new ConsoleTransport(new PrettyFormatter({ colors: !isTest(env) }))
        : new JsonTransport(new JsonFormatter()),
    ];

    return new BaseLogger({ level, transports, context: options.context });
  }
}
