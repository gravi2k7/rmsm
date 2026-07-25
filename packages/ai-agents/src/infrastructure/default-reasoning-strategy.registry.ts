import type { ReasoningStrategyRegistry, ReasoningStrategy } from "../repositories/reasoning-strategy.interface";

export class DefaultReasoningStrategyRegistry implements ReasoningStrategyRegistry {
  private readonly strategies = new Map<string, ReasoningStrategy>();

  register(name: string, strategy: ReasoningStrategy): void {
    this.strategies.set(name, strategy);
  }

  get(name: string): ReasoningStrategy | undefined {
    return this.strategies.get(name);
  }
}
