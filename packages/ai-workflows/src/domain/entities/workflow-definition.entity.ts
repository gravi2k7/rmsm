import type { StepDefinition } from "./step-definition.entity";

export interface WorkflowDefinition {
  readonly id: string;
  readonly name: string;
  readonly steps: readonly StepDefinition[];
}
