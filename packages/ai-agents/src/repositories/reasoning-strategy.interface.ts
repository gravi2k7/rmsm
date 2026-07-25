import type { AgentContext } from "../domain/entities/agent-context.entity";
import type { AgentStepResult } from "../domain/entities/agent-step-result.entity";

/**
 * The "Agent reasoning abstraction" boundary — no LLM/provider
 * dependency in any implementation this package ships.
 * `SequentialReasoningStrategy` (a real, deterministic strategy that
 * walks a fixed list of caller-supplied step functions) is the only
 * concrete implementation here; a real LLM-driven ReAct/function-calling
 * strategy (likely built on `@rmsm/ai-chat`'s `ChatProvider`) is a
 * future adapter of this same interface.
 */
export interface ReasoningStrategy {
  nextStep(context: AgentContext, history: readonly AgentStepResult[]): Promise<AgentStepResult>;
}

export interface ReasoningStrategyRegistry {
  register(name: string, strategy: ReasoningStrategy): void;
  get(name: string): ReasoningStrategy | undefined;
}
