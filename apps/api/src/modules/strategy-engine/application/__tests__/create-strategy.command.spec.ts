import { CreateStrategyHandler, CreateStrategyCommand } from "../commands/create-strategy.command";
import { DuplicateSlugException } from "../errors/application.errors";
import type { StrategyRepository } from "../../infrastructure/repositories/strategy.repository";
import type { HistoryRecorderService } from "../services/history-recorder.service";
import type { EventPublisher } from "../events/event-publisher.interface";

function buildHandler() {
  const strategyRepository = { findBySlug: jest.fn(), save: jest.fn() } as unknown as StrategyRepository;
  const historyRecorder = { record: jest.fn() } as unknown as HistoryRecorderService;
  const eventPublisher: EventPublisher = { publish: jest.fn() };
  return { handler: new CreateStrategyHandler(strategyRepository, historyRecorder, eventPublisher), strategyRepository, historyRecorder, eventPublisher };
}

describe("CreateStrategyHandler", () => {
  it("creates and saves a real Strategy aggregate when the slug is available", async () => {
    const { handler, strategyRepository, historyRecorder, eventPublisher } = buildHandler();
    (strategyRepository.findBySlug as jest.Mock).mockResolvedValue(null);

    const strategy = await handler.execute(new CreateStrategyCommand("org1", "RSI Mean Reversion", "desc", "MEAN_REVERSION", "user1"));

    expect(strategy.name).toBe("RSI Mean Reversion");
    expect(strategy.organizationId).toBe("org1");
    expect(strategyRepository.save).toHaveBeenCalledWith(strategy);
    expect(historyRecorder.record).toHaveBeenCalledWith(strategy.id, "STRATEGY_CREATED", "user1", expect.objectContaining({ name: "RSI Mean Reversion" }));
    expect(eventPublisher.publish).toHaveBeenCalledWith([expect.objectContaining({ kind: "StrategyCreated", strategyId: strategy.id, organizationId: "org1" })], expect.any(String), expect.any(String));
  });

  it("throws DuplicateSlugException, WITHOUT saving, when a strategy with the same slug already exists in the org", async () => {
    const { handler, strategyRepository, eventPublisher } = buildHandler();
    (strategyRepository.findBySlug as jest.Mock).mockResolvedValue({ id: "existing" });

    await expect(handler.execute(new CreateStrategyCommand("org1", "RSI Mean Reversion", "desc", "MEAN_REVERSION", "user1"))).rejects.toThrow(DuplicateSlugException);
    expect(strategyRepository.save).not.toHaveBeenCalled();
    expect(eventPublisher.publish).not.toHaveBeenCalled();
  });

  it("checks slug uniqueness scoped to the SAME organization the command specifies", async () => {
    const { handler, strategyRepository } = buildHandler();
    (strategyRepository.findBySlug as jest.Mock).mockResolvedValue(null);
    await handler.execute(new CreateStrategyCommand("org1", "Test Strategy", "desc", "CUSTOM", "user1"));
    expect(strategyRepository.findBySlug).toHaveBeenCalledWith("test-strategy", "org1");
  });
});
