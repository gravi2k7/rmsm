/**
 * @rmsm/health
 *
 * Health checks and observability primitives: `/health`, `/health/live`,
 * `/health/ready` semantics, system info (uptime, memory, CPU, versions),
 * a database-connectivity abstraction (no concrete DB dependency), and
 * generic in-memory metrics collection — framework-agnostic, zero runtime
 * dependencies.
 *
 * ```ts
 * import { HealthService, HealthController, DatabaseHealthCheck, MemoryHealthCheck, UptimeHealthCheck } from "@rmsm/health";
 *
 * const healthService = new HealthService({
 *   checks: [
 *     new DatabaseHealthCheck({ ping: () => prisma.$queryRaw`SELECT 1` }),
 *     new MemoryHealthCheck(),
 *     new UptimeHealthCheck(),
 *   ],
 * });
 * const healthController = new HealthController(healthService);
 *
 * const { statusCode, body } = await healthController.getReadiness();
 * ```
 */

export * from "./health";
export * from "./checks";
export * from "./metrics";
export * from "./status";
export * from "./types";
