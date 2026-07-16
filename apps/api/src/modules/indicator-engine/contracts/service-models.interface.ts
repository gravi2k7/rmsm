import type { CalculationMode } from "./calculation-window.interface";
import type { IndicatorCategory } from "./indicator-category.enum";
import type { ExecutionResult } from "./execution-result.interface";
import type { IndicatorDefinition } from "./indicator-definition.interface";
import type { ParameterValue } from "./parameter-definition.interface";

/**
 * Request/response models (items 8-9) — the ONLY shapes a future
 * consumer (AI-103+) ever constructs or receives. Every field is a
 * plain value (no class instances, no methods) — genuinely
 * serializable, since a future transport layer (REST, item 13's own
 * extension point) will eventually need to marshal these over the
 * wire, even though no transport exists yet.
 */

// ---- Request models (item 8) ----

export interface ExecuteIndicatorRequest {
  indicatorIdentifier: string;
  /** Omitted = latest registered version, the same default every other AI-102 lookup uses. */
  version?: string;
  instrumentId: string;
  timeframe: string;
  parameters: Record<string, ParameterValue>;
  calculationMode: CalculationMode;
  from: string;
  to: string;
  executionOptions?: { timeoutMs?: number; cancellable?: boolean };
  /**
   * Phase 5 addition — the platform's own correlation id
   * (`Request.requestId`, AI-101 Phase 5's `RequestIdMiddleware`,
   * applied globally). Optional because this interface is also used
   * internally/in tests where no real HTTP request exists — but every
   * REAL call through `IndicatorController` supplies it, satisfying
   * item 4's own explicit "every execution should include: request
   * id..." requirement. Threaded through to every structured log line
   * this execution produces (`IndicatorExecutionServiceImpl`'s own
   * summary log, `ComputationEngineService`'s own per-step logs).
   */
  requestId?: string;
}

export interface QueryIndicatorRequest {
  category?: IndicatorCategory;
  tags?: string[];
  identifier?: string;
  version?: string;
}

export interface IndicatorValidationRequest {
  indicatorIdentifier: string;
  version?: string;
  parameters: Record<string, ParameterValue>;
  timeframe: string;
}

// ---- Response models (item 9) ----

export interface ExecutionSummary {
  executionId: string;
  indicatorIdentifier: string;
  status: "COMPLETED" | "FAILED" | "CANCELLED";
  durationMs: number;
  stepCount: number;
}

export interface IndicatorExecutionResponse {
  summary: ExecutionSummary;
  /** The root indicator's own result — undefined when `summary.status !== "COMPLETED"`. */
  result?: ExecutionResult;
  /** Every step's own result, keyed by identifier — present even on partial failure, so a caller can see exactly which dependency (if any) succeeded before the failure occurred. */
  stepResults: Record<string, ExecutionResult>;
  errors: string[];
}

export interface IndicatorMetadataResponse {
  definition: IndicatorDefinition;
}

export interface IndicatorListResponse {
  indicators: IndicatorDefinition[];
  totalCount: number;
}

export interface ValidationResponse {
  valid: boolean;
  errors: string[];
}
