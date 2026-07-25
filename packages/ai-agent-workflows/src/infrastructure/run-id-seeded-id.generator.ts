import type { IdGenerator } from "@rmsm/core";

/**
 * Guarantees AI-310's `WorkflowEngine.run()` mints `firstId` as its
 * OWN `executionId` (its very first act is `idGenerator.generate()`),
 * so `AgentWorkflowRunner` can correlate the `WorkflowDomainEvent`s
 * that call carries back to the `runId` it already committed to —
 * without any shared mutable correlation state or event-ordering race
 * across concurrent runs. Every subsequent `generate()` call (used for
 * step-level event ids) delegates to the real, injected generator. */
export class RunIdSeededIdGenerator implements IdGenerator {
  private used = false;

  constructor(
    private readonly firstId: string,
    private readonly fallback: IdGenerator,
  ) {}

  generate(): string {
    if (!this.used) {
      this.used = true;
      return this.firstId;
    }
    return this.fallback.generate();
  }
}
