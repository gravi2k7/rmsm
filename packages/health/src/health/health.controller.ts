import type { HealthReport, HealthStatus, SystemInfo } from "../types/health.types";
import type { HealthService } from "./health.service";

export interface HealthHttpResponse<TBody> {
  readonly statusCode: number;
  readonly body: TBody;
}

export type FullHealthReport = HealthReport & { readonly system: SystemInfo };

/**
 * Deliberately not a decorated `@Controller()` (NestJS) or Express router
 * — this package has zero framework dependency, matching `@rmsm/core`'s
 * own zero-dependency-beyond-workspace-packages philosophy. This is the
 * framework-agnostic core a real route handler delegates to:
 *
 * ```ts
 * // apps/api's own NestJS controller
 * @Controller("health")
 * export class HealthController {
 *   constructor(private readonly core: RmsmHealthController) {}
 *
 *   @Get()
 *   async health() {
 *     const { statusCode, body } = await this.core.getHealth();
 *     // NestJS: throw an HttpException for non-200, or use @Res() to set status directly
 *     return body;
 *   }
 * }
 * ```
 *
 * `statusCode` follows the standard convention: `down` → 503 (so a load
 * balancer/orchestrator correctly treats the instance as unhealthy),
 * everything else (`up`/`degraded`) → 200 (the instance IS serving
 * requests — `degraded` is informational, not a reason to fail the
 * check).
 */
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  async getHealth(): Promise<HealthHttpResponse<FullHealthReport>> {
    const report = await this.healthService.checkAll();
    return { statusCode: statusCodeFor(report.status), body: { ...report, system: this.healthService.getSystemInfo() } };
  }

  getLiveness(): HealthHttpResponse<HealthReport> {
    const report = this.healthService.checkLiveness();
    return { statusCode: statusCodeFor(report.status), body: report };
  }

  async getReadiness(): Promise<HealthHttpResponse<HealthReport>> {
    const report = await this.healthService.checkReadiness();
    return { statusCode: statusCodeFor(report.status), body: report };
  }
}

function statusCodeFor(status: HealthStatus): number {
  return status === "down" ? 503 : 200;
}
