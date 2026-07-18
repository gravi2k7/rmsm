import { describe, expect, it, vi } from "vitest";
import { ConsoleTransport } from "../transports/console.transport";
import { JsonTransport } from "../transports/json.transport";
import { JsonFormatter } from "../formatters/json.formatter";
import type { LogEntry } from "../types/logger.types";

const ENTRY = (level: LogEntry["level"]): LogEntry => ({
  level,
  message: "hello",
  timestamp: "2026-01-01T00:00:00.000Z",
  context: {},
});

describe("ConsoleTransport", () => {
  it("routes error/fatal entries to console.error", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    new ConsoleTransport({ format: () => "line" }).write(ENTRY("error"));
    new ConsoleTransport({ format: () => "line" }).write(ENTRY("fatal"));
    expect(spy).toHaveBeenCalledTimes(2);
    spy.mockRestore();
  });

  it("routes warn entries to console.warn", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    new ConsoleTransport({ format: () => "line" }).write(ENTRY("warn"));
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  it("routes trace/debug/info entries to console.log", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    new ConsoleTransport({ format: () => "line" }).write(ENTRY("trace"));
    new ConsoleTransport({ format: () => "line" }).write(ENTRY("debug"));
    new ConsoleTransport({ format: () => "line" }).write(ENTRY("info"));
    expect(spy).toHaveBeenCalledTimes(3);
    spy.mockRestore();
  });

  it("writes the formatter's own output, not a raw entry dump", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    new ConsoleTransport({ format: () => "custom-formatted-line" }).write(ENTRY("info"));
    expect(spy).toHaveBeenCalledWith("custom-formatted-line");
    spy.mockRestore();
  });
});

describe("JsonTransport", () => {
  it("writes one JSON line terminated with a newline to process.stdout", () => {
    const spy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    new JsonTransport(new JsonFormatter()).write(ENTRY("info"));

    expect(spy).toHaveBeenCalledTimes(1);
    const written = spy.mock.calls[0]?.[0] as string;
    expect(written.endsWith("\n")).toBe(true);
    expect(() => JSON.parse(written.trimEnd())).not.toThrow();
    spy.mockRestore();
  });

  it("defaults to JsonFormatter when none is supplied", () => {
    const spy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    new JsonTransport().write(ENTRY("info"));
    const written = spy.mock.calls[0]?.[0] as string;
    expect(JSON.parse(written.trimEnd())).toMatchObject({ level: "info", message: "hello" });
    spy.mockRestore();
  });
});
