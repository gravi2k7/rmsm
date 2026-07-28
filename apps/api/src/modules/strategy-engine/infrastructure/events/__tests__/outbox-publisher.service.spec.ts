import { OutboxPublisherService } from "../outbox-publisher.service";
import type { StrategyOutboxRepository } from "../../repositories/strategy-outbox.repository";
import type { EventDispatcherService } from "../../../integration/dispatcher/event-dispatcher.service";
import { StrategyEventMetricsService } from "../../../integration/services/strategy-event-metrics.service";
import type { StrategyOutboxEvent as OutboxRow } from "@rmsm/database";
import type { Env } from "@rmsm/config";
import { loadConfig } from "@rmsm/config";

jest.mock("@rmsm/config", () => ({
  loadConfig: jest.fn(),
}));

function buildRow(overrides: Partial<OutboxRow> = {}): OutboxRow {
  return {
    id: "evt1",
    organizationId: "org1",
    aggregateId: "strat1",
    aggregateType: "Strategy",
    eventType: "StrategyCreated",
    payload: {},
    correlationId: "corr1",
    causationId: "corr1",
    userId: "user1",
    occurredAt: new Date(),
    status: "PENDING",
    retryCount: 0,
    lastError: null,
    processedAt: null,
    createdAt: new Date(),
    ...overrides,
  };
}

function buildTestConfig(overrides: Partial<Env> = {}): Env {
  return {
    STRATEGY_OUTBOX_PUBLISHER_ENABLED: true,
    STRATEGY_OUTBOX_POLL_INTERVAL_MS: 5000,
    STRATEGY_OUTBOX_BATCH_SIZE: 20,
    STRATEGY_OUTBOX_MAX_RETRIES: 3,
    ...overrides,
  } as Env;
}

/** dispatchImpl lets each test supply exactly the dispatch behavior it needs (real dependency injection, not reaching into the service's own private fields after construction to swap a mock mid-test). */
function buildService(config: Env, dispatchImpl: jest.Mock = jest.fn().mockResolvedValue(undefined)) {
  (loadConfig as jest.Mock).mockReturnValue(config);
 
  const outboxRepository = {
    findPendingBatch: jest.fn(),
    markProcessing: jest.fn().mockResolvedValue(undefined),
    markPublished: jest.fn().mockResolvedValue(undefined),
    markFailed: jest.fn().mockResolvedValue(undefined),
    markPoison: jest.fn().mockResolvedValue(undefined),
  } as unknown as StrategyOutboxRepository;
  const dispatcher = { dispatch: dispatchImpl } as unknown as EventDispatcherService;
  const metrics = new StrategyEventMetricsService();
  const service = new OutboxPublisherService(outboxRepository, dispatcher, metrics,);
  return { service, outboxRepository, dispatcher, metrics };
}

describe("OutboxPublisherService — real retry and poison logic", () => {
  it("marks a successfully-dispatched event PUBLISHED", async () => {
    const dispatchImpl = jest.fn().mockResolvedValue(undefined);
    const { service, outboxRepository } = buildService(buildTestConfig(), dispatchImpl);
    const row = buildRow();
    (outboxRepository.findPendingBatch as jest.Mock).mockResolvedValue([row]);

    await service.pollOnce();

    expect(outboxRepository.markProcessing).toHaveBeenCalledWith(row.id);
    expect(dispatchImpl).toHaveBeenCalled();
    expect(outboxRepository.markPublished).toHaveBeenCalledWith(row.id);
    expect(outboxRepository.markPoison).not.toHaveBeenCalled();
  });

  it("marks a failed dispatch for RETRY (not poison) when retryCount is still below max", async () => {
    const dispatchImpl = jest.fn().mockRejectedValue(new Error("delivery failed"));
    const { service, outboxRepository, metrics } = buildService(buildTestConfig({ STRATEGY_OUTBOX_MAX_RETRIES: 3 }), dispatchImpl);
    const row = buildRow({ retryCount: 0 });
    (outboxRepository.findPendingBatch as jest.Mock).mockResolvedValue([row]);

    await service.pollOnce();

    expect(outboxRepository.markFailed).toHaveBeenCalledWith(row.id, "delivery failed");
    expect(outboxRepository.markPoison).not.toHaveBeenCalled();
    expect(metrics.snapshot().retryCount).toBe(1);
  });

  it("moves an event to POISON once it has exhausted its own real retry budget", async () => {
    const dispatchImpl = jest.fn().mockRejectedValue(new Error("still failing"));
    const { service, outboxRepository } = buildService(buildTestConfig({ STRATEGY_OUTBOX_MAX_RETRIES: 3 }), dispatchImpl);
    // retryCount 2 -> this attempt is the 3rd (2 + 1 = 3 = maxRetries) -> poison, not another retry.
    const row = buildRow({ retryCount: 2 });
    (outboxRepository.findPendingBatch as jest.Mock).mockResolvedValue([row]);

    await service.pollOnce();

    expect(outboxRepository.markPoison).toHaveBeenCalledWith(row.id, "still failing");
    expect(outboxRepository.markFailed).not.toHaveBeenCalled();
  });

  it("processes multiple events in one batch independently — one poisoned event doesn't block the others from publishing", async () => {
    const dispatchImpl = jest.fn().mockImplementation((event: { aggregateId: string }) => (event.aggregateId === "good-strat" ? Promise.resolve() : Promise.reject(new Error("bad"))));
    const { service, outboxRepository } = buildService(buildTestConfig({ STRATEGY_OUTBOX_MAX_RETRIES: 1 }), dispatchImpl);
    const goodRow = buildRow({ id: "good", aggregateId: "good-strat", retryCount: 0 });
    const badRow = buildRow({ id: "bad", aggregateId: "bad-strat", retryCount: 0 });
    (outboxRepository.findPendingBatch as jest.Mock).mockResolvedValue([goodRow, badRow]);

    await service.pollOnce();

    expect(outboxRepository.markPublished).toHaveBeenCalledWith("good");
    expect(outboxRepository.markPoison).toHaveBeenCalledWith("bad", "bad");
  });

  it("respects the configured batch size when fetching pending events", async () => {
    const { service, outboxRepository } = buildService(buildTestConfig({ STRATEGY_OUTBOX_BATCH_SIZE: 7 }));
    (outboxRepository.findPendingBatch as jest.Mock).mockResolvedValue([]);
    await service.pollOnce();
    expect(outboxRepository.findPendingBatch).toHaveBeenCalledWith(7);
  });
});
