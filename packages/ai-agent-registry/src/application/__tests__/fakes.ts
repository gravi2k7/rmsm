import type { Clock, IdGenerator } from "@rmsm/core";
import type { EventPublisher } from "../../events/event-publisher.interface";
import type { AgentRegistryDomainEvent } from "../../events/agent-registry-domain-events.interface";

export class FixedClock implements Clock {
  constructor(private current: Date = new Date("2026-01-01T00:00:00.000Z")) {}
  now(): Date {
    return this.current;
  }
}

export class SequentialIdGenerator implements IdGenerator {
  private counter = 0;
  generate(): string {
    this.counter += 1;
    return `id-${this.counter}`;
  }
}

export class RecordingEventPublisher implements EventPublisher {
  public readonly published: AgentRegistryDomainEvent[] = [];
  async publish(events: readonly AgentRegistryDomainEvent[]): Promise<void> {
    this.published.push(...events);
  }
}

export function buildAgentConfig(overrides: Partial<{ id: string; name: string; description: string; reasoningStrategyName: string; maxSteps: number }> = {}) {
  return {
    id: overrides.id ?? "agent-1",
    name: overrides.name ?? "Test Agent",
    description: overrides.description ?? "a test agent",
    reasoningStrategyName: overrides.reasoningStrategyName ?? "sequential",
    maxSteps: overrides.maxSteps ?? 5,
  };
}
