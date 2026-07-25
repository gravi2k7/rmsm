import type { WorkflowContext } from "./workflow-context.entity";
import type { RetryPolicy } from "./retry-policy.entity";

/**
 * One node in a `WorkflowDefinition`'s DAG. `handlerName` is resolved
 * against a `StepHandlerRegistry` at run time (data-driven, like
 * `@rmsm/ai-classification`'s `ClassificationRule.label` resolving
 * against a classifier) — the handler function itself lives outside
 * this entity. `dependsOn` is this step's set of upstream step ids;
 * `WorkflowEngine` computes execution order (and what runs in
 * parallel) from the full DAG, not from array order. `condition` is a
 * real function (like `ai-chat`'s `ToolHandler`) supplied by the
 * caller — if it returns false, the step is marked `SKIPPED` and its
 * handler never runs (the "conditional routing" capability).
 */
export interface StepDefinition {
  readonly id: string;
  readonly handlerName: string;
  readonly dependsOn?: readonly string[];
  readonly retry?: RetryPolicy;
  readonly timeoutMs?: number;
  readonly condition?: (context: WorkflowContext) => boolean;
}
