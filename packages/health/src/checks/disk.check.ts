import { statfs } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import type { HealthCheck, HealthCheckResult } from "../types/health.types";

export interface DiskHealthCheckOptions {
  /** Filesystem path to check free space on. Defaults to `process.cwd()`. */
  readonly path?: string;
  /** Free-space ratio (0–1) below which the check reports `degraded`.
   * Defaults to 0.1 (10% free remaining). */
  readonly degradedThreshold?: number;
}

/** Uses `fs.promises.statfs` — built into Node since v19.6.0/v18.15.0, no
 * external dependency (e.g. no `check-disk-space` package). Not
 * `critical` by default: low disk space is a real operational signal,
 * but most services degrade gracefully well before actually running out,
 * so it shouldn't reflexively pull an instance out of rotation. */
export class DiskHealthCheck implements HealthCheck {
  readonly name = "disk";
  readonly critical = false;
  private readonly path: string;
  private readonly degradedThreshold: number;

  constructor(options: DiskHealthCheckOptions = {}) {
    this.path = options.path ?? process.cwd();
    this.degradedThreshold = options.degradedThreshold ?? 0.1;
  }

  async check(): Promise<HealthCheckResult> {
    const startedAt = performance.now();
    try {
      const stats = await statfs(this.path);
      const totalBytes = stats.blocks * stats.bsize;
      const freeBytes = stats.bfree * stats.bsize;
      const freeRatio = totalBytes > 0 ? freeBytes / totalBytes : 0;

      return {
        name: this.name,
        status: freeRatio < this.degradedThreshold ? "degraded" : "up",
        message: freeRatio < this.degradedThreshold ? `Only ${(freeRatio * 100).toFixed(1)}% disk free on ${this.path}` : undefined,
        durationMs: performance.now() - startedAt,
        meta: { path: this.path, totalBytes, freeBytes, freeRatio },
      };
    } catch (error) {
      return {
        name: this.name,
        status: "down",
        message: error instanceof Error ? error.message : String(error),
        durationMs: performance.now() - startedAt,
      };
    }
  }
}
