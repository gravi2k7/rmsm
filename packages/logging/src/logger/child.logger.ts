import type { Logger, LogContext } from "../types/logger.types";

/**
 * A logger scoped with additional bound context (e.g. a module name, a
 * request-specific id) on top of a parent logger's own context — without
 * re-implementing level filtering or transport dispatch, both of which
 * stay entirely the parent's responsibility. `ChildLogger` depends only
 * on the public `Logger` interface, never on `BaseLogger`'s internals, so
 * `logger.ts` importing `ChildLogger` (for its own `child()` method)
 * creates no circular module dependency.
 *
 * Children nest cleanly: `logger.child({a: 1}).child({b: 2})` merges both
 * context objects onto every call, in the order they were added.
 */
export class ChildLogger implements Logger {
  constructor(
    private readonly parent: Logger,
    private readonly context: LogContext,
  ) {}

  trace(message: string, context?: LogContext): void {
    this.parent.trace(message, this.merge(context));
  }

  debug(message: string, context?: LogContext): void {
    this.parent.debug(message, this.merge(context));
  }

  info(message: string, context?: LogContext): void {
    this.parent.info(message, this.merge(context));
  }

  warn(message: string, context?: LogContext): void {
    this.parent.warn(message, this.merge(context));
  }

  error(message: string, errorOrContext?: unknown, context?: LogContext): void {
    if (errorOrContext instanceof Error) {
      this.parent.error(message, errorOrContext, this.merge(context));
    } else {
      this.parent.error(message, this.merge(errorOrContext as LogContext | undefined));
    }
  }

  fatal(message: string, errorOrContext?: unknown, context?: LogContext): void {
    if (errorOrContext instanceof Error) {
      this.parent.fatal(message, errorOrContext, this.merge(context));
    } else {
      this.parent.fatal(message, this.merge(errorOrContext as LogContext | undefined));
    }
  }

  child(context: LogContext): Logger {
    return new ChildLogger(this, context);
  }

  private merge(callSiteContext: LogContext | undefined): LogContext {
    return { ...this.context, ...callSiteContext };
  }
}
