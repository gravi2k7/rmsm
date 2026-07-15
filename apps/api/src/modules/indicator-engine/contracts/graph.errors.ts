/**
 * Structured graph exceptions (item 12) — a FIFTH standardized error
 * hierarchy in this project now (AI-101's `MarketDataValidationError`;
 * AI-102's `IndicatorValidationError` (Phase 1), `RegistryValidationError`
 * (Phase 2A), `ExecutionError` (Phase 2B), and now `GraphError`, this
 * phase). Deliberately distinct from all four — this hierarchy answers
 * "what went wrong while building/validating a dependency GRAPH or
 * PLAN," a different concern than registering one definition
 * (`RegistryValidationError`) or running one execution (`ExecutionError`).
 */
export abstract class GraphError extends Error {
  abstract readonly code: string;
  readonly context: Record<string, unknown>;
  constructor(message: string, context: Record<string, unknown> = {}) {
    super(message);
    this.name = new.target.name;
    this.context = context;
  }
}

export class DependencyNotFoundException extends GraphError {
  readonly code = "DependencyNotFound";
}
/** Carries the actual cycle (item 5's own "descriptive exceptions" requirement) — see CircularDependencyInfo, dependency-graph.interface.ts. */
export class CircularDependencyException extends GraphError {
  readonly code = "CircularDependency";
}
export class InvalidGraphException extends GraphError {
  readonly code = "InvalidGraph";
}
export class ExecutionPlanException extends GraphError {
  readonly code = "ExecutionPlan";
}
export class DependencyVersionException extends GraphError {
  readonly code = "DependencyVersion";
}
export class UnsupportedDependencyException extends GraphError {
  readonly code = "UnsupportedDependency";
}
