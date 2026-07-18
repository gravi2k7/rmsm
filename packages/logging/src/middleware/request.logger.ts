import { CorrelationContext } from "../context/correlation.context";
import { Timer } from "../utils/timer";
import type { Logger } from "../types/logger.types";

/**
 * Minimal structural shapes covering what this middleware needs from an
 * HTTP request/response — deliberately not importing Express's own types
 * (which would pull in `@types/express` as a dependency this package
 * doesn't otherwise need). Express's own `Request`/`Response` — and
 * NestJS's, which wraps Express by default — satisfy this shape
 * structurally without any explicit adapter.
 */
export interface RequestLike {
  readonly method: string;
  readonly url: string;
  readonly headers: Readonly<Record<string, string | string[] | undefined>>;
}

export interface ResponseLike {
  statusCode: number;
  on(event: "finish", listener: () => void): void;
}

export type NextLike = () => void;

export interface RequestLoggerOptions {
  /** Inbound header to read an existing correlation id from, if the
   * caller (e.g. an upstream gateway) already assigned one — falls back
   * to generating a new one via `CorrelationContext.generate()` when
   * absent. Defaults to `"x-correlation-id"`. */
  readonly correlationIdHeader?: string;
}

/**
 * Creates Express/Connect/NestJS-middleware-shaped request logging
 * middleware: logs one line per request (method, url, status, duration)
 * and runs the entire request inside `CorrelationContext.run()` so every
 * log call anywhere downstream automatically picks up the same
 * correlation id, without the request handler needing to pass it
 * explicitly.
 */
export function createRequestLoggerMiddleware(logger: Logger, options: RequestLoggerOptions = {}) {
  const headerName = (options.correlationIdHeader ?? "x-correlation-id").toLowerCase();

  return function requestLoggerMiddleware(req: RequestLike, res: ResponseLike, next: NextLike): void {
    const inboundHeader = req.headers[headerName];
    const correlationId = (Array.isArray(inboundHeader) ? inboundHeader[0] : inboundHeader) ?? CorrelationContext.generate();

    CorrelationContext.run(correlationId, () => {
      const timer = Timer.start();

      res.on("finish", () => {
        const durationMs = timer.stop();
        logger.info(`${req.method} ${req.url}`, {
          method: req.method,
          url: req.url,
          statusCode: res.statusCode,
          durationMs: Math.round(durationMs),
        });
      });

      next();
    });
  };
}
