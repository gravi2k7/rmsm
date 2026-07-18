import type { HealthCheckResult, HealthStatus } from "../types/health.types";
import { worstStatus } from "../types/health.types";

/**
 * Computes overall readiness from a set of check results: only `critical`
 * checks (the default for most checks — see `HealthCheck.critical`) can
 * bring readiness down to `down`; a `degraded`/`down` result from a
 * non-critical check still surfaces in the aggregate status as
 * `degraded` (visible, but not readiness-failing) rather than being
 * silently dropped.
 */
export function computeReadinessStatus(
  results: readonly HealthCheckResult[],
  criticalCheckNames: ReadonlySet<string>,
): HealthStatus {
  const criticalStatuses: HealthStatus[] = [];
  const nonCriticalStatuses: HealthStatus[] = [];

  for (const result of results) {
    if (criticalCheckNames.has(result.name)) {
      criticalStatuses.push(result.status);
    } else {
      // A non-critical check failing outright still shouldn't fail
      // readiness — downgrade "down" to "degraded" here, at the source,
      // rather than relying on worstStatus() to somehow know which
      // "down" came from a critical check and which didn't (it can't;
      // by the time statuses are merged, that provenance is gone).
      nonCriticalStatuses.push(result.status === "down" ? "degraded" : result.status);
    }
  }

  const criticalOverall = worstStatus(criticalStatuses);
  if (criticalOverall === "down") return "down";

  return worstStatus([criticalOverall, ...nonCriticalStatuses]);
}
