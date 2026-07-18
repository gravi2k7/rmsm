/**
 * @rmsm/logging
 *
 * Production-grade structured logging: pretty console output in
 * development, JSON on stdout in production, correlation/trace id
 * propagation via `AsyncLocalStorage`, child loggers, execution timers,
 * and error serialization — framework-agnostic, one workspace dependency
 * (`@rmsm/config`, for environment-aware defaults).
 *
 * ```ts
 * import { LoggerFactory } from "@rmsm/logging";
 *
 * const logger = LoggerFactory.createLogger({ context: { service: "api" } });
 * logger.info("Server started", { port: 3001 });
 *
 * const requestLogger = logger.child({ correlationId: "abc-123" });
 * requestLogger.error("Failed to process request", new Error("boom"));
 * ```
 */

export * from "./logger";
export * from "./transports";
export * from "./formatters";
export * from "./middleware";
export * from "./context";
export * from "./types";
export * from "./utils";
