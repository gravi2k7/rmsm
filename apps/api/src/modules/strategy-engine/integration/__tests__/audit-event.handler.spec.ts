import { AuditEventHandler } from "../handlers/audit-event.handler";
import type { AuditService } from "../../../auth/services/audit.service";
import type { IntegrationEvent } from "../events/integration-event.interface";

describe("AuditEventHandler — reuses the platform's own existing AuditService", () => {
  it("translates one IntegrationEvent into one real AuditService.log() call, carrying this milestone's own required metadata fields", async () => {
    const auditService = { log: jest.fn().mockResolvedValue(undefined) } as unknown as AuditService;
    const handler = new AuditEventHandler(auditService);

    const event: IntegrationEvent = {
      eventId: "evt1",
      aggregateId: "strat1",
      aggregateType: "Strategy",
      organizationId: "org1",
      schemaVersion: 1,
      occurredAt: new Date("2026-01-01T00:00:00Z"),
      correlationId: "corr1",
      causationId: "cause1",
      userId: "user1",
      source: "strategy-engine",
      eventType: "StrategyCreated",
      payload: { name: "Test Strategy" },
      metadata: {},
    };

    await handler.handle(event);

    expect(auditService.log).toHaveBeenCalledWith(
      "strategy-engine.StrategyCreated",
      expect.objectContaining({
        userId: "user1",
        entityType: "Strategy",
        entityId: "strat1",
        metadata: expect.objectContaining({
          organizationId: "org1",
          correlationId: "corr1",
          causationId: "cause1",
          eventId: "evt1",
          payload: { name: "Test Strategy" },
        }),
      }),
    );
  });

  it("passes userId: null through honestly for a system-initiated event, not a fake placeholder string", async () => {
    const auditService = { log: jest.fn().mockResolvedValue(undefined) } as unknown as AuditService;
    const handler = new AuditEventHandler(auditService);

    const event: IntegrationEvent = {
      eventId: "evt1",
      aggregateId: "strat1",
      aggregateType: "Strategy",
      organizationId: "org1",
      schemaVersion: 1,
      occurredAt: new Date(),
      correlationId: "corr1",
      causationId: null,
      userId: null,
      source: "strategy-engine",
      eventType: "StrategyArchived",
      payload: {},
      metadata: {},
    };

    await handler.handle(event);
    expect(auditService.log).toHaveBeenCalledWith("strategy-engine.StrategyArchived", expect.objectContaining({ userId: null }));
  });
});
