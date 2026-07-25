import type { Clock, IdGenerator } from "@rmsm/core";
import type { EventPublisher } from "../../events/event-publisher.interface";
import type { AgentSecurityDomainEvent } from "../../events/agent-security-domain-events.interface";
import type { SecretsProvider } from "../../repositories/secrets-provider.interface";

export class FixedClock implements Clock {
  private current: number;
  constructor(start: Date = new Date("2026-01-01T00:00:00.000Z")) {
    this.current = start.getTime();
  }
  now(): Date {
    return new Date(this.current);
  }
  advanceMs(ms: number): void {
    this.current += ms;
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
  public readonly published: AgentSecurityDomainEvent[] = [];
  async publish(events: readonly AgentSecurityDomainEvent[]): Promise<void> {
    this.published.push(...events);
  }
}

export class InMemorySecretsProvider implements SecretsProvider {
  constructor(private readonly secrets: Readonly<Record<string, string>> = {}) {}
  async getSecret(name: string): Promise<string | null> {
    return this.secrets[name] ?? null;
  }
}
