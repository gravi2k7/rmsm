import { describe, expect, it } from "vitest";
import { JsonFormatter } from "../formatters/json.formatter";
import { PrettyFormatter } from "../formatters/pretty.formatter";
import type { LogEntry } from "../types/logger.types";

const BASE_ENTRY: LogEntry = {
  level: "info",
  message: "hello world",
  timestamp: "2026-01-01T12:00:00.000Z",
  context: { service: "api", requestId: "r1" },
};

describe("JsonFormatter", () => {
  it("produces valid, parseable JSON", () => {
    const output = new JsonFormatter().format(BASE_ENTRY);
    expect(() => JSON.parse(output)).not.toThrow();
  });

  it("includes level, message, timestamp, and every context field at the top level", () => {
    const parsed = JSON.parse(new JsonFormatter().format(BASE_ENTRY));
    expect(parsed).toMatchObject({ level: "info", message: "hello world", timestamp: BASE_ENTRY.timestamp, service: "api", requestId: "r1" });
  });

  it("includes the serialized error when present", () => {
    const entryWithError: LogEntry = { ...BASE_ENTRY, error: { name: "Error", message: "boom" } };
    const parsed = JSON.parse(new JsonFormatter().format(entryWithError));
    expect(parsed.error).toEqual({ name: "Error", message: "boom" });
  });

  it("omits the error key entirely when absent", () => {
    const parsed = JSON.parse(new JsonFormatter().format(BASE_ENTRY));
    expect(parsed.error).toBeUndefined();
  });

  it("produces exactly one line (no embedded newlines)", () => {
    const output = new JsonFormatter().format(BASE_ENTRY);
    expect(output.includes("\n")).toBe(false);
  });
});

describe("PrettyFormatter", () => {
  it("includes the level, message, and context key=value pairs", () => {
    const output = new PrettyFormatter({ colors: false }).format(BASE_ENTRY);
    expect(output).toContain("INFO");
    expect(output).toContain("hello world");
    expect(output).toContain("service=api");
    expect(output).toContain("requestId=r1");
  });

  it("includes ANSI color codes by default", () => {
    const output = new PrettyFormatter().format(BASE_ENTRY);
    // eslint-disable-next-line no-control-regex -- intentionally matching a raw ANSI escape sequence
    expect(/\x1b\[/.test(output)).toBe(true);
  });

  it("omits ANSI color codes when colors is false", () => {
    const output = new PrettyFormatter({ colors: false }).format(BASE_ENTRY);
    // eslint-disable-next-line no-control-regex -- intentionally matching a raw ANSI escape sequence
    expect(/\x1b\[/.test(output)).toBe(false);
  });

  it("appends the error stack (or name: message) on its own line when present", () => {
    const entryWithError: LogEntry = { ...BASE_ENTRY, error: { name: "Error", message: "boom", stack: "Error: boom\n  at x" } };
    const output = new PrettyFormatter({ colors: false }).format(entryWithError);
    expect(output).toContain("Error: boom");
  });

  it("handles an entry with no context fields gracefully", () => {
    const bare: LogEntry = { level: "info", message: "no context", timestamp: BASE_ENTRY.timestamp, context: {} };
    const output = new PrettyFormatter({ colors: false }).format(bare);
    expect(output).toContain("no context");
  });
});
