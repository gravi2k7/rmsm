import { describe, expect, it, vi } from "vitest";
import { BaseLogger, serializeError } from "../logger/logger";
import type { LogEntry, Transport } from "../types/logger.types";

function captureTransport(): { transport: Transport; entries: LogEntry[] } {
  const entries: LogEntry[] = [];
  return { transport: { write: (entry) => entries.push(entry) }, entries };
}

describe("BaseLogger — level filtering", () => {
  it("writes an entry at or above the configured level", () => {
    const { transport, entries } = captureTransport();
    const logger = new BaseLogger({ level: "info", transports: [transport] });

    logger.info("hello");
    expect(entries).toHaveLength(1);
  });

  it("drops an entry below the configured level", () => {
    const { transport, entries } = captureTransport();
    const logger = new BaseLogger({ level: "warn", transports: [transport] });

    logger.info("should be dropped");
    logger.debug("should also be dropped");
    expect(entries).toHaveLength(0);
  });

  it("respects trace as the most verbose level", () => {
    const { transport, entries } = captureTransport();
    const logger = new BaseLogger({ level: "trace", transports: [transport] });

    logger.trace("t");
    logger.fatal("f");
    expect(entries.map((e) => e.level)).toEqual(["trace", "fatal"]);
  });
});

describe("BaseLogger — entry shape", () => {
  it("includes message, level, ISO timestamp, and merged context", () => {
    const { transport, entries } = captureTransport();
    const logger = new BaseLogger({ transports: [transport], context: { service: "api" } });

    logger.info("hello", { requestId: "r1" });

    expect(entries[0]).toMatchObject({ level: "info", message: "hello", context: { service: "api", requestId: "r1" } });
    expect(entries[0]?.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("dispatches to every configured transport", () => {
    const a = captureTransport();
    const b = captureTransport();
    const logger = new BaseLogger({ transports: [a.transport, b.transport] });

    logger.info("hello");
    expect(a.entries).toHaveLength(1);
    expect(b.entries).toHaveLength(1);
  });
});

describe("BaseLogger — error(message, error, context)", () => {
  it("serializes an Error instance into entry.error", () => {
    const { transport, entries } = captureTransport();
    const logger = new BaseLogger({ transports: [transport] });

    logger.error("failed", new Error("boom"));
    expect(entries[0]?.error).toMatchObject({ name: "Error", message: "boom" });
    expect(entries[0]?.error?.stack).toContain("Error: boom");
  });

  it("treats a plain object second argument as context, not an error", () => {
    const { transport, entries } = captureTransport();
    const logger = new BaseLogger({ transports: [transport] });

    logger.error("failed", { code: "X" });
    expect(entries[0]?.error).toBeUndefined();
    expect(entries[0]?.context).toMatchObject({ code: "X" });
  });

  it("accepts an explicit context alongside an Error", () => {
    const { transport, entries } = captureTransport();
    const logger = new BaseLogger({ transports: [transport] });

    logger.error("failed", new Error("boom"), { requestId: "r1" });
    expect(entries[0]?.context).toMatchObject({ requestId: "r1" });
    expect(entries[0]?.error?.message).toBe("boom");
  });

  it("fatal() behaves the same way as error()", () => {
    const { transport, entries } = captureTransport();
    const logger = new BaseLogger({ transports: [transport] });

    logger.fatal("critical", new Error("down"));
    expect(entries[0]?.level).toBe("fatal");
    expect(entries[0]?.error?.message).toBe("down");
  });
});

describe("serializeError", () => {
  it("extracts name/message/stack from a real Error", () => {
    const result = serializeError(new Error("boom"));
    expect(result.name).toBe("Error");
    expect(result.message).toBe("boom");
    expect(result.stack).toBeDefined();
  });

  it("handles a thrown non-Error value without losing it", () => {
    const result = serializeError("a plain string");
    expect(result.name).toBe("NonError");
    expect(result.nonErrorValue).toBe("a plain string");
  });

  it("preserves a custom Error subclass's name", () => {
    class CustomError extends Error {
      constructor(message: string) {
        super(message);
        this.name = "CustomError";
      }
    }
    const result = serializeError(new CustomError("custom failure"));
    expect(result.name).toBe("CustomError");
  });
});

describe("BaseLogger — default construction", () => {
  it("defaults to level 'info' and a ConsoleTransport when given no options", () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const logger = new BaseLogger();

    logger.debug("dropped"); // below default 'info' level
    logger.info("shown");

    expect(logSpy).toHaveBeenCalledTimes(1);
    logSpy.mockRestore();
  });
});
