import type { WorkflowContext } from "../domain/entities/workflow-context.entity";

export interface StepHandler {
  (input: unknown, context: WorkflowContext): Promise<unknown>;
}

export interface StepHandlerRegistry {
  register(name: string, handler: StepHandler): void;
  get(name: string): StepHandler | undefined;
}
