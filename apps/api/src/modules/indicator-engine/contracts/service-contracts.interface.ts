import type {
  ExecuteIndicatorRequest,
  QueryIndicatorRequest,
  IndicatorValidationRequest,
  IndicatorExecutionResponse,
  IndicatorMetadataResponse,
  IndicatorListResponse,
  ValidationResponse,
} from "./service-models.interface";

/**
 * The 6 service contracts item 7 names. **`ExecutionFacade` and
 * `IndicatorEngineService` are the same interface, not two** — item 6's
 * own recommendation ("implement IndicatorEngineService as the single
 * public entry point") and item 6's "create a single façade for future
 * consumers" describe the identical architectural role from two
 * angles. Declaring a second, separate `ExecutionFacade` interface
 * `IndicatorEngineService` merely implements would invite exactly the
 * confusion item 6 itself warns against — two names for "the one thing
 * to call." `ExecutionFacade` is aliased to `IndicatorEngineService`
 * below so both names in this phase's own spec resolve to one real
 * type, not two competing entry points.
 */

/** Item 2 — Registry-only discovery, no execution. Wraps `RegistryQueryService`/`IndicatorRegistryService` (Phase 2A) — never called directly by anything outside this module. */
export interface IndicatorQueryService {
  list(request: QueryIndicatorRequest): IndicatorListResponse;
  lookup(identifier: string, version?: string): IndicatorMetadataResponse;
  listCategories(): string[];
  listVersions(identifier: string): string[];
  /** Item 2's own "parameter inspection" — the definition's own `inputs` array, surfaced as its own method rather than making a caller dig through `IndicatorMetadataResponse.definition.inputs` by hand for this one common case. */
  inspectParameters(identifier: string, version?: string): IndicatorMetadataResponse["definition"]["inputs"];
}

/** Item 3 — Orchestrates ExecutionPlanner + ComputationEngine for one request, including every step of a dependency-bearing indicator's own plan. "No calculations" — never calls Indicator.calculate() itself; ComputationEngineService does. */
export interface IndicatorExecutionService {
  execute(request: ExecuteIndicatorRequest): Promise<IndicatorExecutionResponse>;
}

/** Item 4 — Every validation concern item 4 names, unified into one response shape rather than 6 separate throw-or-not methods, so a caller (or a future REST layer) can report every problem found, not just the first one this internal call happened to hit. */
export interface IndicatorValidationService {
  validate(request: IndicatorValidationRequest): ValidationResponse;
}

/** Item 5 — The SERVICE's own lifecycle (this module's own readiness to accept requests at all), distinct from `IndicatorLifecycleState` (Phase 2B — one EXECUTION's own lifecycle). A service is "ready" once; an execution goes through REGISTERED→...→COMPLETED on every single call. */
export type ServiceLifecycleState = "INITIALIZING" | "READY" | "EXECUTING" | "SHUTTING_DOWN" | "SHUTDOWN";

export interface IndicatorLifecycleService {
  getState(): ServiceLifecycleState;
  initialize(): void;
  shutdown(): void;
}

/**
 * Item 1 + item 6 — the single public entry point. Every future
 * consumer (AI-103+) imports and calls ONLY this interface — never
 * `IndicatorRegistryService`, `DependencyGraphBuilderService`,
 * `ExecutionPlannerService`, or `ComputationEngineService` directly,
 * per item 6's own explicit rule.
 */
export interface IndicatorEngineService {
  execute(request: ExecuteIndicatorRequest): Promise<IndicatorExecutionResponse>;
  query(request: QueryIndicatorRequest): IndicatorListResponse;
  lookup(identifier: string, version?: string): IndicatorMetadataResponse;
  validate(request: IndicatorValidationRequest): ValidationResponse;
}

/** Item 6's own name, resolved as described above — the identical contract as `IndicatorEngineService`, not a second interface. */
export type ExecutionFacade = IndicatorEngineService;
