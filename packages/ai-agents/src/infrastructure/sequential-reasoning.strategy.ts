import type { ReasoningStrategy } from "../repositories/reasoning-strategy.interface";
import type { AgentContext } from "../domain/entities/agent-context.entity";
import type { AgentStepResult } from "../domain/entities/agent-step-result.entity";

export interface StepFn {
  (context: AgentContext, history: readonly AgentStepResult[]): Promise<unknown>;
}

/**
 * The real, default `ReasoningStrategy` — walks a fixed, caller-supplied
 * list of step functions in order, one per `nextStep()` call, marking
 * the last one `isFinal: true`. No LLM/provider dependency; a real
 * ReAct/function-calling strategy driven by `@rmsm/ai-chat`'s
 * `ChatProvider` is a future implementation of this same interface.
 */
export class SequentialReasoningStrategy implements ReasoningStrategy {
  constructor(private readonly steps: readonly StepFn[]) {}

  async nextStep(context: AgentContext, history: readonly AgentStepResult[]): Promise<AgentStepResult> {
    const stepIndex = history.length;
    const stepFn = this.steps[stepIndex];
    if (!stepFn) {
      return { stepIndex, isFinal: true, output: history[history.length - 1]?.output };
    }

    const output = await stepFn(context, history);
    const isFinal = stepIndex === this.steps.length - 1;
    return { stepIndex, output, isFinal };
  }
}
