import { toIntegrationEvent } from "../events/domain-to-integration-event.mapper";
import type { StrategyCreatedEvent, StrategyValidatedEvent, StrategyVersionCreatedEvent, StrategyVersionRolledBackEvent } from "../../domain/events/strategy-domain-events.interface";

describe("toIntegrationEvent", () => {
  it("maps a Strategy-level event's aggregateId to the strategyId, aggregateType to Strategy", () => {
    const domainEvent: StrategyCreatedEvent = { kind: "StrategyCreated", organizationId: "org1", strategyId: "strat1", actorId: "user1", occurredAt: new Date(), name: "Test", category: "CUSTOM" };
    const event = toIntegrationEvent(domainEvent, "corr1", "corr1");
    expect(event.aggregateId).toBe("strat1");
    expect(event.aggregateType).toBe("Strategy");
  });

  it("maps a StrategyVersion-level event's aggregateId to the strategyVersionId, aggregateType to StrategyVersion", () => {
    const domainEvent: StrategyVersionCreatedEvent = { kind: "StrategyVersionCreated", organizationId: "org1", strategyId: "strat1", actorId: "user1", occurredAt: new Date(), strategyVersionId: "ver1", versionNumber: 1 };
    const event = toIntegrationEvent(domainEvent, "corr1", "corr1");
    expect(event.aggregateId).toBe("ver1");
    expect(event.aggregateType).toBe("StrategyVersion");
  });

  it("maps StrategyValidated (a version-scoped event, despite carrying strategyId too) to aggregateType StrategyVersion", () => {
    const domainEvent: StrategyValidatedEvent = { kind: "StrategyValidated", organizationId: "org1", strategyId: "strat1", actorId: "user1", occurredAt: new Date(), strategyVersionId: "ver1", passed: true, findingCount: 0 };
    const event = toIntegrationEvent(domainEvent, "corr1", "corr1");
    expect(event.aggregateId).toBe("ver1");
    expect(event.aggregateType).toBe("StrategyVersion");
  });

  it("maps StrategyVersionRolledBack — a real bug this test caught: it uses newVersionId, not strategyVersionId, and an earlier kind-whitelist implementation missed it entirely", () => {
    const domainEvent: StrategyVersionRolledBackEvent = { kind: "StrategyVersionRolledBack", organizationId: "org1", strategyId: "strat1", actorId: "user1", occurredAt: new Date(), newVersionId: "ver2", newVersionNumber: 2, rolledBackFromVersionId: "ver1" };
    const event = toIntegrationEvent(domainEvent, "corr1", "corr1");
    expect(event.aggregateId).toBe("ver2");
    expect(event.aggregateType).toBe("StrategyVersion");
  });

  it("never leaks organizationId/strategyId/actorId/occurredAt/kind into payload — they're promoted to real envelope fields, not duplicated", () => {
    const domainEvent: StrategyCreatedEvent = { kind: "StrategyCreated", organizationId: "org1", strategyId: "strat1", actorId: "user1", occurredAt: new Date(), name: "Test", category: "CUSTOM" };
    const event = toIntegrationEvent(domainEvent, "corr1", "corr1");
    expect(event.payload).not.toHaveProperty("organizationId");
    expect(event.payload).not.toHaveProperty("strategyId");
    expect(event.payload).not.toHaveProperty("actorId");
    expect(event.payload).not.toHaveProperty("occurredAt");
    expect(event.payload).not.toHaveProperty("kind");
    expect(event.payload).toEqual({ name: "Test", category: "CUSTOM" });
  });

  it("carries every required metadata field this milestone's own Event Metadata section names", () => {
    const domainEvent: StrategyCreatedEvent = { kind: "StrategyCreated", organizationId: "org1", strategyId: "strat1", actorId: "user1", occurredAt: new Date(), name: "Test", category: "CUSTOM" };
    const event = toIntegrationEvent(domainEvent, "corr1", "cause1");

    expect(event.eventId).toEqual(expect.any(String));
    expect(event.aggregateId).toBe("strat1");
    expect(event.aggregateType).toBe("Strategy");
    expect(event.organizationId).toBe("org1");
    expect(event.schemaVersion).toBe(1);
    expect(event.occurredAt).toBeInstanceOf(Date);
    expect(event.correlationId).toBe("corr1");
    expect(event.causationId).toBe("cause1");
    expect(event.userId).toBe("user1");
    expect(event.source).toBe("strategy-engine");
    expect(event.eventType).toBe("StrategyCreated");
  });

  it("generates a genuinely unique eventId for every call, even for the same domain event", () => {
    const domainEvent: StrategyCreatedEvent = { kind: "StrategyCreated", organizationId: "org1", strategyId: "strat1", actorId: "user1", occurredAt: new Date(), name: "Test", category: "CUSTOM" };
    const first = toIntegrationEvent(domainEvent, "corr1", "corr1");
    const second = toIntegrationEvent(domainEvent, "corr1", "corr1");
    expect(first.eventId).not.toBe(second.eventId);
  });
});
