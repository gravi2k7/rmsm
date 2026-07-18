import { performance } from "node:perf_hooks";
import type { HealthCheck, HealthCheckResult } from "../types/health.types";

/** The process having a positive uptime is inherently true whenever this
 * check can run at all — this exists to surface the value in the health
 * report's own `meta`, not because uptime can meaningfully "fail". Never
 * critical. */
export class UptimeHealthCheck implements HealthCheck {
  readonly name = "uptime";
  readonly critical = false;

  async check(): Promise<HealthCheckResult> {
    const startedAt = performance.now();
    const uptimeSeconds = process.uptime();
    return {
      name: this.name,
      status: "up",
      durationMs: performance.now() - startedAt,
      meta: { uptimeSeconds },
    };
  }
}
