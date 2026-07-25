/** The "Agent configuration" capability — a named, versioned
 * definition of one agent: which `ReasoningStrategy` (resolved by
 * name against a registry, the same data-driven pattern
 * `@rmsm/ai-classification`'s `ClassificationRule.label` uses) it
 * runs, and how many steps it's allowed to take before
 * `MaxStepsExceededError` stops it. */
export interface AgentConfig {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly reasoningStrategyName: string;
  readonly maxSteps: number;
}
