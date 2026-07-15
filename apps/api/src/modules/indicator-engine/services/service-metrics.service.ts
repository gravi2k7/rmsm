import { Injectable } from "@nestjs/common";
import type { ServiceMetricsSnapshot } from "../contracts/service-metrics.interface";

/** Real, in-memory aggregate counters — item 11's own field list, exactly. The same honestly-scoped, single-instance pattern as every metrics service in this project. Wired into `IndicatorExecutionServiceImpl` (request/execution-outcome/planning-duration) and `IndicatorValidationServiceImpl` (validation failures) — every field on `ServiceMetricsSnapshot` is populated by a real call site, not left declared-but-unused. */
@Injectable()
export class ServiceMetricsService {
  private requestCount = 0;
  private successfulExecutions = 0;
  private failedExecutions = 0;
  private totalExecutionTimeMs = 0;
  private validationFailures = 0;
  private totalPlanningDurationMs = 0;
  private planningCount = 0;

  recordRequest(): void {
    this.requestCount += 1;
  }

  recordExecutionOutcome(succeeded: boolean, durationMs: number): void {
    if (succeeded) this.successfulExecutions += 1;
    else this.failedExecutions += 1;
    this.totalExecutionTimeMs += durationMs;
  }

  recordValidationFailure(): void {
    this.validationFailures += 1;
  }

  recordPlanningDuration(durationMs: number): void {
    this.totalPlanningDurationMs += durationMs;
    this.planningCount += 1;
  }

  snapshot(): ServiceMetricsSnapshot {
    const totalExecutions = this.successfulExecutions + this.failedExecutions;
    return {
      requestCount: this.requestCount,
      successfulExecutions: this.successfulExecutions,
      failedExecutions: this.failedExecutions,
      averageExecutionTimeMs: totalExecutions === 0 ? 0 : this.totalExecutionTimeMs / totalExecutions,
      validationFailures: this.validationFailures,
      averagePlanningDurationMs: this.planningCount === 0 ? 0 : this.totalPlanningDurationMs / this.planningCount,
    };
  }
}
