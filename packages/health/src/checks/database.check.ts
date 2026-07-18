import { performance } from "node:perf_hooks";
import type { DatabasePinger, HealthCheck, HealthCheckResult } from "../types/health.types";

/**
 * Verifies database connectivity via an injected {@link DatabasePinger} —
 * this package never depends on `@prisma/client` or any other concrete
 * database driver. `apps/api` supplies the real implementation (typically
 * a one-line `prisma.$queryRaw\`SELECT 1\`` wrapped to satisfy the
 * `ping(): Promise<void>` contract).
 *
 * Marked `critical` by default: an instance that can't reach its database
 * genuinely shouldn't receive traffic, so this fails readiness (not just
 * liveness) unless a consumer explicitly opts out.
 */
export class DatabaseHealthCheck implements HealthCheck {
  readonly name = "database";
  readonly critical: boolean;

  constructor(
    private readonly pinger: DatabasePinger,
    options: { critical?: boolean } = {},
  ) {
    this.critical = options.critical ?? true;
  }

  async check(): Promise<HealthCheckResult> {
    const startedAt = performance.now();
    try {
      await this.pinger.ping();
      return { name: this.name, status: "up", durationMs: performance.now() - startedAt };
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
