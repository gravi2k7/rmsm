import { describe, expect, it, vi } from "vitest";
import { createRequestLoggerMiddleware, type RequestLike, type ResponseLike } from "../middleware/request.logger";
import { CorrelationContext } from "../context/correlation.context";
import { BaseLogger } from "../logger/logger";
import type { LogEntry, Transport } from "../types/logger.types";

function fakeResponse(): ResponseLike {
  let finishListener: (() => void) | undefined;
  return {
    statusCode: 200,
    on: (event, listener) => {
      if (event === "finish") {
        finishListener = listener;
        // Schedules the listener via a real async primitive (setImmediate),
        // from within whatever context is active at registration time — the
        // same shape a real http.ServerResponse's own internal completion
        // scheduling has. A plain, later, out-of-band function call (the
        // previous version of this mock) doesn't exercise AsyncLocalStorage's
        // real propagation semantics at all, since it isn't an async
        // continuation of anything — it's an unrelated later call.
        setImmediate(() => finishListener?.());
      }
    },
  };
}

function captureTransport(): { transport: Transport; entries: LogEntry[] } {
  const entries: LogEntry[] = [];
  return { transport: { write: (entry) => entries.push(entry) }, entries };
}

describe("createRequestLoggerMiddleware", () => {
  it("logs one entry with method/url/statusCode/durationMs when the response finishes", async () => {
    const { transport, entries } = captureTransport();
    const logger = new BaseLogger({ transports: [transport] });
    const middleware = createRequestLoggerMiddleware(logger);
    const req: RequestLike = { method: "GET", url: "/strategies", headers: {} };
    const res = fakeResponse();
    const next = vi.fn();

    middleware(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(entries).toHaveLength(0); // not logged until the response finishes

    res.statusCode = 201;
    await new Promise((resolve) => setImmediate(resolve)); // let the scheduled 'finish' callback run

    expect(entries).toHaveLength(1);
    expect(entries[0]?.context).toMatchObject({ method: "GET", url: "/strategies", statusCode: 201 });
    expect(typeof entries[0]?.context.durationMs).toBe("number");
  });

  it("generates a correlation id when the inbound request has none", () => {
    const { transport } = captureTransport();
    const logger = new BaseLogger({ transports: [transport] });
    const middleware = createRequestLoggerMiddleware(logger);
    const req: RequestLike = { method: "GET", url: "/x", headers: {} };
    const res = fakeResponse();

    let observedDuringRequest: string | undefined;
    middleware(req, res, () => {
      observedDuringRequest = CorrelationContext.get();
    });

    expect(observedDuringRequest).toBeTruthy();
  });

  it("reuses an inbound x-correlation-id header instead of generating a new one", () => {
    const { transport } = captureTransport();
    const logger = new BaseLogger({ transports: [transport] });
    const middleware = createRequestLoggerMiddleware(logger);
    const req: RequestLike = { method: "GET", url: "/x", headers: { "x-correlation-id": "inbound-id" } };
    const res = fakeResponse();

    let observed: string | undefined;
    middleware(req, res, () => {
      observed = CorrelationContext.get();
    });

    expect(observed).toBe("inbound-id");
  });

  it("supports a custom correlation id header name", () => {
    const { transport } = captureTransport();
    const logger = new BaseLogger({ transports: [transport] });
    const middleware = createRequestLoggerMiddleware(logger, { correlationIdHeader: "x-request-id" });
    const req: RequestLike = { method: "GET", url: "/x", headers: { "x-request-id": "custom-id" } };
    const res = fakeResponse();

    let observed: string | undefined;
    middleware(req, res, () => {
      observed = CorrelationContext.get();
    });

    expect(observed).toBe("custom-id");
  });

  it("the correlation id set during the request is available to downstream logging on finish", async () => {
    const { transport, entries } = captureTransport();
    const logger = new BaseLogger({ transports: [transport] });
    const middleware = createRequestLoggerMiddleware(logger);
    const req: RequestLike = { method: "GET", url: "/x", headers: { "x-correlation-id": "trace-me" } };
    const res = fakeResponse();

    middleware(req, res, () => undefined);
    await new Promise((resolve) => setImmediate(resolve));

    expect(entries[0]?.context.correlationId).toBe("trace-me");
  });
});
