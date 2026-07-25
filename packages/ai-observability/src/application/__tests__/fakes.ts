import type { Clock, IdGenerator } from "@rmsm/core";
import type { TraceRepository } from "../../tracing/trace-repository.interface";
import type { MetricsRepository } from "../../metrics/metrics-repository.interface";
import type { TelemetryPublisher } from "../../events/telemetry-publisher.interface";
import type { ObservabilityDomainEvent } from "../../events/observability-domain-events.interface";
import type { AuditEntryRepository } from "../services/audit.service";
import { InMemoryTraceRepository } from "../../infrastructure/in-memory-trace.repository";
import { InMemoryMetricsRepository } from "../../infrastructure/in-memory-metrics.repository";
import { InMemoryAuditEntryRepository } from "../../infrastructure/in-memory-audit-entry.repository";

export class FixedClock implements Clock {
  constructor(private current: Date) {}
  now(): Date {
    return this.current;
  }
  advance(ms: number): void {
    this.current = new Date(this.current.getTime() + ms);
  }
}

export class SequentialIdGenerator implements IdGenerator {
  private counter = 0;
  generate(): string {
    this.counter += 1;
    return `id-${this.counter}`;
  }
}

export class RecordingTelemetryPublisher implements TelemetryPublisher {
  public readonly published: ObservabilityDomainEvent[] = [];
  async publish(events: readonly ObservabilityDomainEvent[]): Promise<void> {
    this.published.push(...events);
  }
}

export function makeTraceRepository(): TraceRepository {
  return new InMemoryTraceRepository();
}

export function makeMetricsRepository(): MetricsRepository {
  return new InMemoryMetricsRepository();
}

export function makeAuditEntryRepository(): AuditEntryRepository {
  return new InMemoryAuditEntryRepository();
}
