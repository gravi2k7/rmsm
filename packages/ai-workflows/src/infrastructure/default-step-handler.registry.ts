import type { StepHandlerRegistry, StepHandler } from "../repositories/step-handler-registry.interface";

export class DefaultStepHandlerRegistry implements StepHandlerRegistry {
  private readonly handlers = new Map<string, StepHandler>();

  register(name: string, handler: StepHandler): void {
    this.handlers.set(name, handler);
  }

  get(name: string): StepHandler | undefined {
    return this.handlers.get(name);
  }
}
