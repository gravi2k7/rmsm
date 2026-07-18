import { describe, expect, it } from "vitest";
import { BaseLogger } from "../logger/logger";
import type { LogEntry, Transport } from "../types/logger.types";

function captureTransport(): { transport: Transport; entries: LogEntry[] } {
  const entries: LogEntry[] = [];
  return { transport: { write: (entry) => entries.push(entry) }, entries };
}

describe("Logger.child", () => {
  it("merges the child's bound context into every call", () => {
    const { transport, entries } = captureTransport();
    const root = new BaseLogger({ transports: [transport], context: { service: "api" } });
    const child = root.child({ module: "auth" });

    child.info("hello");
    expect(entries[0]?.context).toMatchObject({ service: "api", module: "auth" });
  });

  it("call-site context wins over bound context on key collision", () => {
    const { transport, entries } = captureTransport();
    const root = new BaseLogger({ transports: [transport] });
    const child = root.child({ requestId: "bound" });

    child.info("hello", { requestId: "call-site" });
    expect(entries[0]?.context.requestId).toBe("call-site");
  });

  it("nests two levels deep, merging in order", () => {
    const { transport, entries } = captureTransport();
    const root = new BaseLogger({ transports: [transport] });
    const grandchild = root.child({ a: 1 }).child({ b: 2 });

    grandchild.info("hello");
    expect(entries[0]?.context).toMatchObject({ a: 1, b: 2 });
  });

  it("still applies the root logger's level filtering", () => {
    const { transport, entries } = captureTransport();
    const root = new BaseLogger({ level: "warn", transports: [transport] });
    const child = root.child({ module: "auth" });

    child.info("dropped");
    expect(entries).toHaveLength(0);
  });

  it("forwards an Error correctly through error()", () => {
    const { transport, entries } = captureTransport();
    const root = new BaseLogger({ transports: [transport] });
    const child = root.child({ module: "auth" });

    child.error("failed", new Error("boom"), { requestId: "r1" });
    expect(entries[0]?.error?.message).toBe("boom");
    expect(entries[0]?.context).toMatchObject({ module: "auth", requestId: "r1" });
  });

  it("treats a plain-object second argument to error() as context, same as BaseLogger", () => {
    const { transport, entries } = captureTransport();
    const root = new BaseLogger({ transports: [transport] });
    const child = root.child({ module: "auth" });

    child.error("failed", { code: "X" });
    expect(entries[0]?.error).toBeUndefined();
    expect(entries[0]?.context).toMatchObject({ module: "auth", code: "X" });
  });
});
