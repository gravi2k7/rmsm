/**
 * Core types for the logging framework. Every other file in this package
 * builds on these — `Transport`/`Formatter` are the two seams concrete
 * implementations plug into (console vs. JSON transport; pretty vs. JSON
 * formatter), and `Logger` is the contract `child.logger.ts` composes
 * over rather than reimplementing.
 */

/** Ordered from most to least verbose. Numeric severity below matches
 * this order, lowest number = most verbose, for threshold comparisons. */
export type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal";

export const LOG_LEVEL_SEVERITY: Readonly<Record<LogLevel, number>> = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  fatal: 60,
};

export const LOG_LEVELS: readonly LogLevel[] = ["trace", "debug", "info", "warn", "error", "fatal"];

/** Arbitrary structured fields attached to a log call or a logger's own
 * bound context (module name, correlation id, organization id, ...). Kept
 * as `unknown` values, not `any` — a consumer reading a specific field
 * back out is expected to narrow it, this type only guarantees the shape
 * is a flat, JSON-serializable-ish object. */
export type LogContext = Readonly<Record<string, unknown>>;

/** The result of serializing a caught error for structured logging — never
 * log a raw `Error` object directly (most transports/formatters would
 * either drop its fields or produce `"[object Object]"`), always go
 * through `serializeError()` in `logger/logger.ts` first. */
export interface SerializedError {
  readonly name: string;
  readonly message: string;
  readonly stack?: string;
  /** Present when the caught value wasn't actually an `Error` instance —
   * e.g. `throw "a string"` — so the original value isn't silently lost. */
  readonly nonErrorValue?: unknown;
}

/** One fully-assembled log record, ready to hand to a transport/formatter.
 * Everything a `Logger` call produces is exactly this shape. */
export interface LogEntry {
  readonly level: LogLevel;
  readonly message: string;
  readonly timestamp: string;
  readonly context: LogContext;
  readonly error?: SerializedError;
}

/** Renders a `LogEntry` to a string — `PrettyFormatter` for human-
 * readable development output, `JsonFormatter` for machine-parseable
 * production output. */
export interface Formatter {
  format(entry: LogEntry): string;
}

/** Delivers a formatted (or raw, for `JsonTransport`) log record
 * somewhere — stdout via `console.*`, stdout as raw JSON lines, or (a
 * future extension point) a remote log-aggregator sink. */
export interface Transport {
  write(entry: LogEntry): void;
}

export interface LoggerOptions {
  /** Minimum level that reaches a transport; anything below this severity
   * is dropped before formatting/writing even happens. */
  readonly level?: LogLevel;
  readonly transports?: readonly Transport[];
  /** Context merged into every entry this logger (or its children)
   * produce — e.g. a service name bound once at construction. */
  readonly context?: LogContext;
}

/** The contract every logger (root or child) satisfies — `child.logger.ts`
 * implements this by delegating to a parent rather than duplicating the
 * filtering/dispatch logic in `logger.ts`. */
export interface Logger {
  trace(message: string, context?: LogContext): void;
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, errorOrContext?: unknown, context?: LogContext): void;
  fatal(message: string, errorOrContext?: unknown, context?: LogContext): void;
  /** Returns a new logger with `context` merged into this logger's own
   * bound context — the primary way to attach e.g. a correlation id or
   * module name once and have it appear on every subsequent call. */
  child(context: LogContext): Logger;
}
