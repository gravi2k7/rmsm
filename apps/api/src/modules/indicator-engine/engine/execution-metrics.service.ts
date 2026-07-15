import { Injectable } from "@nestjs/common";
import type { ExecutionMetrics } from "../contracts/execution-metrics.interface";

/**
 * A real, per-execution timing builder plus a lightweight aggregate
 * counter — the same honestly-scoped, single-instance, in-memory
 * pattern as AI-101's `MarketDataMetricsService`. `startPhase`/`endPhase`
 * measure one execution's own breakdown (fed into that execution's own
 * `ExecutionResult.metrics`); `recordExecution` additionally rolls
 * completed executions into a simple aggregate (`averageDurationMs`,
 * `totalExecutions`) any future admin/health surface (mirroring
 * AI-101's own `MarketDataAdminService`) could read from later — not
 * built this phase (no controllers/services beyond this, per this
 * phase's own scope), just the real counters underneath one.
 */
@Injectable()
export class ExecutionMetricsService {
  private totalExecutions = 0;
  private totalDurationMs = 0;

  /** Builds one execution's own ExecutionMetrics from 4 measured phase durations — the caller (ComputationEngineService) is responsible for actually timing each phase with Date.now() around it; this method only assembles the result and computes the real (not re-derived) total. */
  buildMetrics(queueTimeMs: number, validationTimeMs: number, initializationTimeMs: number, calculationTimeMs: number): ExecutionMetrics {
    const totalDurationMs = queueTimeMs + validationTimeMs + initializationTimeMs + calculationTimeMs;
    return { queueTimeMs, validationTimeMs, initializationTimeMs, calculationTimeMs, totalDurationMs };
  }

  recordExecution(metrics: ExecutionMetrics): void {
    this.totalExecutions += 1;
    this.totalDurationMs += metrics.totalDurationMs;
  }

  snapshot(): { totalExecutions: number; averageDurationMs: number } {
    return {
      totalExecutions: this.totalExecutions,
      averageDurationMs: this.totalExecutions === 0 ? 0 : this.totalDurationMs / this.totalExecutions,
    };
  }
}
