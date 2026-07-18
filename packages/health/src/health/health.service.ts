import { cpuUsage as processCpuUsage, memoryUsage, uptime } from "node:process";
import { loadavg } from "node:os";
import type { HealthCheck, HealthCheckResult, HealthReport, SystemInfo } from "../types/health.types";
import { worstStatus } from "../types/health.types";
import { computeReadinessStatus } from "../status/readiness";
import { computeLivenessStatus } from "../status/liveness";

export interface HealthServiceOptions {
  readonly checks: readonly HealthCheck[];
  /** Defaults to `process.env.npm_package_version ?? "0.0.0"` — the same
   * fallback `apps/api/src/tracing.ts` already uses for its own service
   * version attribute. */
  readonly appVersion?: string;
}

/**
 * Orchestrates every registered `HealthCheck`, constructor-injected (not
 * a service-locator or global registry) so a consumer wires exactly the
 * checks relevant to it. Runs checks via `Promise.allSettled` — one
 * check throwing an unexpected error produces a `down` result for that
 * check alone, isolated from every other check, the same failure-
 * isolation pattern already established in this platform's own
 * `EventDispatcherService`.
 */
export class HealthService {
  private readonly checks: readonly HealthCheck[];
  private readonly appVersion: string;

  constructor(options: HealthServiceOptions) {
    this.checks = options.checks;
    this.appVersion = options.appVersion ?? process.env.npm_package_version ?? "0.0.0";
  }

  /** Full report: every registered check, aggregated status is the worst
   * of all of them regardless of `critical`. Suitable for `/health`. */
  async checkAll(): Promise<HealthReport> {
    const results = await this.runChecks();
    return { status: worstStatus(results.map((r) => r.status)), timestamp: new Date().toISOString(), checks: results };
  }

  /** Readiness: only `critical` checks (the default) can bring this down
   * to `down`. Suitable for `/health/ready`. */
  async checkReadiness(): Promise<HealthReport> {
    const results = await this.runChecks();
    const criticalNames = new Set(this.checks.filter((c) => c.critical ?? true).map((c) => c.name));
    return { status: computeReadinessStatus(results, criticalNames), timestamp: new Date().toISOString(), checks: results };
  }

  /** Liveness: deliberately does not run any checks — see
   * `status/liveness.ts` for why. Suitable for `/health/live`. */
  checkLiveness(): HealthReport {
    return { status: computeLivenessStatus(), timestamp: new Date().toISOString(), checks: [] };
  }

  getSystemInfo(): SystemInfo {
    const memory = memoryUsage();
    const cpu = processCpuUsage();
    const [loadAverage1m] = loadavg();

    return {
      uptimeSeconds: uptime(),
      memory: {
        rssBytes: memory.rss,
        heapUsedBytes: memory.heapUsed,
        heapTotalBytes: memory.heapTotal,
        heapUsedRatio: memory.heapTotal > 0 ? memory.heapUsed / memory.heapTotal : 0,
      },
      cpu: {
        userMicros: cpu.user,
        systemMicros: cpu.system,
        // 0 on platforms without load-average support (e.g. Windows) —
        // Node's own os.loadavg() documents this, not a bug here.
        loadAverage1m: loadAverage1m ?? 0,
      },
      nodeVersion: process.version,
      appVersion: this.appVersion,
    };
  }

  private async runChecks(): Promise<HealthCheckResult[]> {
    const settled = await Promise.allSettled(this.checks.map((c) => c.check()));
    return settled.map((outcome, index) => {
      if (outcome.status === "fulfilled") return outcome.value;
      const check = this.checks[index];
      return {
        name: check?.name ?? "unknown",
        status: "down",
        message: outcome.reason instanceof Error ? outcome.reason.message : String(outcome.reason),
        durationMs: 0,
      };
    });
  }
}
