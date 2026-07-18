import { ConsoleTransport } from "../transports/console.transport";
import { CorrelationContext } from "../context/correlation.context";
import { TraceContext } from "../context/trace.context";
import { ChildLogger } from "./child.logger";
import {
  LOG_LEVEL_SEVERITY,
  type LogContext,
  type LogEntry,
  type Logger as LoggerContract,
  type LoggerOptions,
  type LogLevel,
  type SerializedError,
  type Transport,
} from "../types/logger.types";

/** Converts a caught value into a structured, loggable shape. Never logs a
 * raw `Error` (or arbitrary thrown value) directly — this is the single
 * place that decides how an error becomes log-safe data. */
export function serializeError(value: unknown): SerializedError {
  if (value instanceof Error) {
    return { name: value.name, message: value.message, stack: value.stack };
  }
  return { name: "NonError", message: String(value), nonErrorValue: value };
}

/**
 * The concrete `Logger` implementation. Filters by level, merges bound
 * context with any active `CorrelationContext`/`TraceContext` and the
 * call-site's own context, then dispatches the assembled `LogEntry` to
 * every configured transport. `child()` returns a `ChildLogger` (see
 * `child.logger.ts`) rather than another `BaseLogger` instance, so
 * context-merging logic lives in exactly one place regardless of how many
 * levels of `.child()` nesting a caller does.
 */
export class BaseLogger implements LoggerContract {
  private readonly level: LogLevel;
  private readonly transports: readonly Transport[];
  private readonly boundContext: LogContext;

  constructor(options: LoggerOptions = {}) {
    this.level = options.level ?? "info";
    this.transports = options.transports ?? [new ConsoleTransport()];
    this.boundContext = options.context ?? {};
  }

  trace(message: string, context?: LogContext): void {
    this.log("trace", message, undefined, context);
  }

  debug(message: string, context?: LogContext): void {
    this.log("debug", message, undefined, context);
  }

  info(message: string, context?: LogContext): void {
    this.log("info", message, undefined, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log("warn", message, undefined, context);
  }

  error(message: string, errorOrContext?: unknown, context?: LogContext): void {
    const [error, ctx] = splitErrorArg(errorOrContext, context);
    this.log("error", message, error, ctx);
  }

  fatal(message: string, errorOrContext?: unknown, context?: LogContext): void {
    const [error, ctx] = splitErrorArg(errorOrContext, context);
    this.log("fatal", message, error, ctx);
  }

  child(context: LogContext): LoggerContract {
    return new ChildLogger(this, context);
  }

  /** Package-internal: builds and dispatches one entry. `ChildLogger`
   * calls this directly (with its own merged context) rather than going
   * through the public `trace`/`debug`/... methods again. */
  protected log(level: LogLevel, message: string, error: unknown, callSiteContext: LogContext | undefined): void {
    if (LOG_LEVEL_SEVERITY[level] < LOG_LEVEL_SEVERITY[this.level]) return;

    const correlationId = CorrelationContext.get();
    const trace = TraceContext.get();

    const context: LogContext = {
      ...this.boundContext,
      ...(correlationId ? { correlationId } : {}),
      ...(trace ? { traceId: trace.traceId, spanId: trace.spanId } : {}),
      ...callSiteContext,
    };

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
      ...(error !== undefined ? { error: serializeError(error) } : {}),
    };

    for (const transport of this.transports) transport.write(entry);
  }
}

/** `error()`/`fatal()` accept either `(message, error, context?)` or
 * `(message, context?)` — this disambiguates the second argument by
 * whether it's actually an `Error` instance. */
function splitErrorArg(errorOrContext: unknown, explicitContext: LogContext | undefined): [unknown, LogContext | undefined] {
  if (errorOrContext instanceof Error) return [errorOrContext, explicitContext];
  if (errorOrContext === undefined) return [undefined, explicitContext];
  return [undefined, errorOrContext as LogContext];
}
