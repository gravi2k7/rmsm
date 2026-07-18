import { describe, expect, it } from "vitest";
import { MetricsService } from "../metrics/metrics.service";

describe("MetricsService — counters", () => {
  it("increments from zero by default amount 1", () => {
    const metrics = new MetricsService();
    metrics.incrementCounter("requests_total");
    metrics.incrementCounter("requests_total");
    expect(metrics.getSnapshot().counters.requests_total).toBe(2);
  });

  it("supports a custom increment amount", () => {
    const metrics = new MetricsService();
    metrics.incrementCounter("bytes_total", undefined, 512);
    expect(metrics.getSnapshot().counters.bytes_total).toBe(512);
  });

  it("tracks distinct label combinations separately", () => {
    const metrics = new MetricsService();
    metrics.incrementCounter("requests_total", { route: "/health" });
    metrics.incrementCounter("requests_total", { route: "/strategies" });
    metrics.incrementCounter("requests_total", { route: "/health" });

    const snapshot = metrics.getSnapshot();
    expect(snapshot.counters['requests_total{route=/health}']).toBe(2);
    expect(snapshot.counters['requests_total{route=/strategies}']).toBe(1);
  });

  it("label key order doesn't create separate series", () => {
    const metrics = new MetricsService();
    metrics.incrementCounter("x", { a: "1", b: "2" });
    metrics.incrementCounter("x", { b: "2", a: "1" });
    expect(metrics.getSnapshot().counters["x{a=1,b=2}"]).toBe(2);
  });
});

describe("MetricsService — gauges", () => {
  it("setGauge overwrites the previous value rather than accumulating", () => {
    const metrics = new MetricsService();
    metrics.setGauge("queue_depth", 5);
    metrics.setGauge("queue_depth", 3);
    expect(metrics.getSnapshot().gauges.queue_depth).toBe(3);
  });
});

describe("MetricsService — histograms", () => {
  it("computes count/sum/min/max across recorded values", () => {
    const metrics = new MetricsService();
    metrics.recordHistogram("latency_ms", 10);
    metrics.recordHistogram("latency_ms", 30);
    metrics.recordHistogram("latency_ms", 20);

    const stats = metrics.getSnapshot().histograms.latency_ms;
    expect(stats).toEqual({ count: 3, sum: 60, min: 10, max: 30 });
  });
});

describe("MetricsService — reset", () => {
  it("clears every counter, gauge, and histogram", () => {
    const metrics = new MetricsService();
    metrics.incrementCounter("a");
    metrics.setGauge("b", 1);
    metrics.recordHistogram("c", 1);

    metrics.reset();

    const snapshot = metrics.getSnapshot();
    expect(Object.keys(snapshot.counters)).toHaveLength(0);
    expect(Object.keys(snapshot.gauges)).toHaveLength(0);
    expect(Object.keys(snapshot.histograms)).toHaveLength(0);
  });
});
