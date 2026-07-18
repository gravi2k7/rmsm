import { describe, expect, it } from "vitest";
import { CorrelationContext } from "../context/correlation.context";
import { TraceContext } from "../context/trace.context";

describe("CorrelationContext", () => {
  it("returns undefined outside of a run() block", () => {
    expect(CorrelationContext.get()).toBeUndefined();
  });

  it("makes the id available inside run()", () => {
    CorrelationContext.run("corr-1", () => {
      expect(CorrelationContext.get()).toBe("corr-1");
    });
  });

  it("propagates across an async chain within the same run()", async () => {
    await CorrelationContext.run("corr-async", async () => {
      await new Promise((resolve) => setTimeout(resolve, 1));
      expect(CorrelationContext.get()).toBe("corr-async");
    });
  });

  it("isolates concurrent run() calls from each other", async () => {
    const results: string[] = [];
    await Promise.all([
      CorrelationContext.run("a", async () => {
        await new Promise((resolve) => setTimeout(resolve, 5));
        results.push(CorrelationContext.get() ?? "unset");
      }),
      CorrelationContext.run("b", async () => {
        await new Promise((resolve) => setTimeout(resolve, 1));
        results.push(CorrelationContext.get() ?? "unset");
      }),
    ]);
    expect(results.sort()).toEqual(["a", "b"]);
  });

  it("generate() produces distinct ids", () => {
    const a = CorrelationContext.generate();
    const b = CorrelationContext.generate();
    expect(a).not.toBe(b);
    expect(typeof a).toBe("string");
    expect(a.length).toBeGreaterThan(0);
  });
});

describe("TraceContext", () => {
  it("returns undefined outside of a run() block", () => {
    expect(TraceContext.get()).toBeUndefined();
  });

  it("makes the trace info available inside run()", () => {
    TraceContext.run({ traceId: "t1", spanId: "s1" }, () => {
      expect(TraceContext.get()).toEqual({ traceId: "t1", spanId: "s1" });
    });
  });

  it("startSpan() reuses the active traceId but generates a new spanId", () => {
    TraceContext.run({ traceId: "t1", spanId: "s1" }, () => {
      const span = TraceContext.startSpan();
      expect(span.traceId).toBe("t1");
      expect(span.spanId).not.toBe("s1");
    });
  });

  it("startSpan() generates a brand new traceId when none is active", () => {
    const span = TraceContext.startSpan();
    expect(span.traceId).toBeTruthy();
    expect(span.spanId).toBeTruthy();
    expect(span.traceId).not.toBe(span.spanId);
  });
});
