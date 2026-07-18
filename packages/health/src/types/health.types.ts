/**
 * Core types for the health/observability framework. `HealthCheck` is the
 * one seam every concrete check (`checks/*.ts`) implements, and the one
 * seam `apps/api` (or any consumer) implements its own checks against —
 * e.g. a real database check backed by Prisma, injected as a
 * `HealthCheck` without this package ever depending on `@prisma/client`.
 */

/**
 * `up`: fully healthy. `degraded`: functioning but outside a healthy
 * threshold (e.g. heap usage high, disk space low) — not yet a failure.
 * `down`: the check itself failed or the resource is unreachable.
 */
export type HealthStatus = "up" | "degraded" | "down";

/** Aggregates a list of individual statuses into one overall status —
 * `down` wins over `degraded` wins over `up`, matching how a single
 * failing dependency should be visible at the top level even if every
 * other check is fine. */
export function worstStatus(statuses: readonly HealthStatus[]): HealthStatus {
  if (statuses.includes("down")) return "down";
  if (statuses.includes("degraded")) return "degraded";
  return "up";
}

export interface HealthCheckResult {
  readonly name: string;
  readonly status: HealthStatus;
  readonly message?: string;
  readonly durationMs: number;
  readonly meta?: Readonly<Record<string, unknown>>;
}

/**
 * One health check. `critical` distinguishes checks that should fail
 * *readiness* (this instance shouldn't receive traffic — e.g. no database
 * connection) from purely informational ones that report `degraded`
 * without making the instance un-ready (e.g. heap usage running high but
 * still serving requests fine). Defaults to `true` when a concrete check
 * doesn't specify otherwise — the safer default for "should this actually
 * gate readiness" is yes, not silently no.
 */
export interface HealthCheck {
  readonly name: string;
  readonly critical?: boolean;
  check(): Promise<HealthCheckResult>;
}

export interface HealthReport {
  readonly status: HealthStatus;
  readonly timestamp: string;
  readonly checks: readonly HealthCheckResult[];
}

export interface SystemInfo {
  readonly uptimeSeconds: number;
  readonly memory: {
    readonly rssBytes: number;
    readonly heapUsedBytes: number;
    readonly heapTotalBytes: number;
    readonly heapUsedRatio: number;
  };
  readonly cpu: {
    readonly userMicros: number;
    readonly systemMicros: number;
    readonly loadAverage1m: number;
  };
  readonly nodeVersion: string;
  readonly appVersion: string;
}

/**
 * Abstraction a consumer implements to let `DatabaseHealthCheck` verify
 * connectivity without this package depending on any concrete database
 * client. `apps/api` would implement this with a one-line Prisma
 * `$queryRaw` ping.
 */
export interface DatabasePinger {
  ping(): Promise<void>;
}
