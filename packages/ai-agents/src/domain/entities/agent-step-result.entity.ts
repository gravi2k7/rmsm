/**
 * One step of an agent's execution — the "Agent reasoning abstraction"
 * capability's output shape, modeled on the think/act/observe loop
 * (a `ReasoningStrategy` may populate `thought`/`action`/`observation`
 * as it sees fit; none are required). `isFinal: true` tells
 * `AgentRuntime` the agent has reached a terminal answer and the run
 * loop should stop before `maxSteps`.
 */
export interface AgentStepResult {
  readonly stepIndex: number;
  readonly thought?: string;
  readonly action?: string;
  readonly observation?: string;
  readonly output?: unknown;
  readonly isFinal: boolean;
}
