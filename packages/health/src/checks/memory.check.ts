import { performance } from "node:perf_hooks";
import type { HealthCheck, HealthCheckResult } from "../types/health.types";

export interface MemoryHealthCheckOptions {
  /** Heap-used/heap-total ratio (0–1) above which the check reports
   * `degraded` rather than `up`. Defaults to 0.9 (90%) — high enough to
   * avoid flapping on normal GC sawtooth behavior, low enough to give an
   * operator real warning before an actual OOM. */
  readonly degradedThreshold?: number;
}

/** Not `critical` by default — high heap usage is a real signal worth
 * surfacing, but reflexively failing readiness on it would pull an
 * instance out of rotation for something GC will very possibly resolve
 * on its own within seconds. */
export class MemoryHealthCheck implements HealthCheck {
  readonly name = "memory";
  readonly critical = false;
  private readonly degradedThreshold: number;

  constructor(options: MemoryHealthCheckOptions = {}) {
    this.degradedThreshold = options.degradedThreshold ?? 0.9;
  }

  async check(): Promise<HealthCheckResult> {
    const startedAt = performance.now();
    const usage = process.memoryUsage();
    const heapUsedRatio = usage.heapTotal > 0 ? usage.heapUsed / usage.heapTotal : 0;

    return {
      name: this.name,
      status: heapUsedRatio >= this.degradedThreshold ? "degraded" : "up",
      message: heapUsedRatio >= this.degradedThreshold ? `Heap usage at ${(heapUsedRatio * 100).toFixed(1)}%` : undefined,
      durationMs: performance.now() - startedAt,
      meta: {
        rssBytes: usage.rss,
        heapUsedBytes: usage.heapUsed,
        heapTotalBytes: usage.heapTotal,
        heapUsedRatio,
      },
    };
  }
}
