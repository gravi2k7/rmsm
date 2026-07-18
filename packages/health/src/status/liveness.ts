import type { HealthStatus } from "../types/health.types";

/**
 * Liveness answers one question only: "is this process able to respond
 * at all" — it must NOT depend on downstream dependencies like a
 * database. The standard, correct Kubernetes-style distinction: if
 * liveness checked DB connectivity, a briefly-unreachable database would
 * cause the orchestrator to kill and restart otherwise-healthy pods
 * (which doesn't fix the database, and adds restart churn on top of an
 * already-degraded dependency). Readiness (`readiness.ts`) is where
 * dependency checks belong — a pod that's alive but not ready simply
 * stops receiving new traffic until it recovers, without being killed.
 *
 * Because of that, liveness has no failure mode worth modeling as a
 * function of check results — it's `"up"` if this code is executing at
 * all, full stop. This function exists mainly for symmetry with
 * `computeReadinessStatus` and as the one place that decision is
 * documented.
 */
export function computeLivenessStatus(): HealthStatus {
  return "up";
}
