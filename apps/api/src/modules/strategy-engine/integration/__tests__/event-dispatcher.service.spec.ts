import { EventDispatcherService } from "../dispatcher/event-dispatcher.service";
import { StrategyEventMetricsService } from "../services/strategy-event-metrics.service";
import type { IntegrationEvent } from "../events/integration-event.interface";
import type { AuditEventHandler } from "../handlers/audit-event.handler";
import type { MetricsEventHandler } from "../handlers/metrics-event.handler";
import type { SearchIndexingHandler } from "../handlers/search-indexing.handler";
import type { AnalyticsHandler } from "../handlers/analytics.handler";
import type { NotificationPlaceholderHandler } from "../handlers/notification-placeholder.handler";

function buildEvent(overrides: Partial<IntegrationEvent> = {}): IntegrationEvent {
  return {
    eventId: "evt1",
    aggregateId: "strat1",
    aggregateType: "Strategy",
    organizationId: "org1",
    schemaVersion: 1,
    occurredAt: new Date(),
    correlationId: "corr1",
    causationId: "corr1",
    userId: "user1",
    source: "strategy-engine",
    eventType: "StrategyCreated",
    payload: {},
    metadata: {},
    ...overrides,
  };
}

describe("EventDispatcherService", () => {
  it("calls every registered handler for one event", async () => {
    const audit = { handle: jest.fn().mockResolvedValue(undefined) } as unknown as AuditEventHandler;
    const metricsHandler = { handle: jest.fn().mockResolvedValue(undefined) } as unknown as MetricsEventHandler;
    const search = { handle: jest.fn().mockResolvedValue(undefined) } as unknown as SearchIndexingHandler;
    const analytics = { handle: jest.fn().mockResolvedValue(undefined) } as unknown as AnalyticsHandler;
    const notification = { handle: jest.fn().mockResolvedValue(undefined) } as unknown as NotificationPlaceholderHandler;
    const metricsService = new StrategyEventMetricsService();
    const dispatcher = new EventDispatcherService(audit, metricsHandler, search, analytics, notification, metricsService);

    const event = buildEvent();
    await dispatcher.dispatch(event);

    expect(audit.handle).toHaveBeenCalledWith(event);
    expect(metricsHandler.handle).toHaveBeenCalledWith(event);
    expect(search.handle).toHaveBeenCalledWith(event);
    expect(analytics.handle).toHaveBeenCalledWith(event);
    expect(notification.handle).toHaveBeenCalledWith(event);
  });

  it("isolates one handler's own failure — the other 4 handlers still run, and dispatch() itself does not throw", async () => {
    const audit = { handle: jest.fn().mockRejectedValue(new Error("audit service down")) } as unknown as AuditEventHandler;
    const metricsHandler = { handle: jest.fn().mockResolvedValue(undefined) } as unknown as MetricsEventHandler;
    const search = { handle: jest.fn().mockResolvedValue(undefined) } as unknown as SearchIndexingHandler;
    const analytics = { handle: jest.fn().mockResolvedValue(undefined) } as unknown as AnalyticsHandler;
    const notification = { handle: jest.fn().mockResolvedValue(undefined) } as unknown as NotificationPlaceholderHandler;
    const metricsService = new StrategyEventMetricsService();
    const dispatcher = new EventDispatcherService(audit, metricsHandler, search, analytics, notification, metricsService);

    await expect(dispatcher.dispatch(buildEvent())).resolves.not.toThrow();
    expect(metricsHandler.handle).toHaveBeenCalled();
    expect(search.handle).toHaveBeenCalled();
    expect(analytics.handle).toHaveBeenCalled();
    expect(notification.handle).toHaveBeenCalled();
  });

  it("records a real handler failure in the metrics service when a handler throws", async () => {
    const audit = { handle: jest.fn().mockRejectedValue(new Error("boom")) } as unknown as AuditEventHandler;
    const metricsHandler = { handle: jest.fn().mockResolvedValue(undefined) } as unknown as MetricsEventHandler;
    const search = { handle: jest.fn().mockResolvedValue(undefined) } as unknown as SearchIndexingHandler;
    const analytics = { handle: jest.fn().mockResolvedValue(undefined) } as unknown as AnalyticsHandler;
    const notification = { handle: jest.fn().mockResolvedValue(undefined) } as unknown as NotificationPlaceholderHandler;
    const metricsService = new StrategyEventMetricsService();
    const dispatcher = new EventDispatcherService(audit, metricsHandler, search, analytics, notification, metricsService);

    await dispatcher.dispatch(buildEvent({ eventType: "StrategyArchived" }));

    expect(metricsService.snapshot().failureCounts.StrategyArchived).toBe(1);
  });
});
