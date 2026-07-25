import type { AgentContext, AgentStepResult } from "@rmsm/ai-agents";
import type { WorkflowDefinition } from "@rmsm/ai-workflows";
import type { AgentWorkflowRunner } from "./agent-workflow-runner.service";

/** A `StepFn`-shaped function (matching `@rmsm/ai-agents`'
 * `SequentialReasoningStrategy`'s step signature exactly, without this
 * package importing that concrete class) that runs a workflow to
 * completion as one reasoning step — "agents may execute workflows."
 * The workflow's input is the agent's current `variables` bag; the
 * `WorkflowExecution` becomes the step's output, so a later step (or
 * the caller) can read individual step results off it. */
export function createWorkflowStepFn(runner: AgentWorkflowRunner, definition: WorkflowDefinition) {
  return async (context: AgentContext, _history: readonly AgentStepResult[]): Promise<unknown> => {
    return runner.runSync(definition, context.variables);
  };
}
