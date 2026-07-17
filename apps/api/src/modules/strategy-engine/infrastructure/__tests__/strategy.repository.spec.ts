import { StrategyRepository } from "../repositories/strategy.repository";
import { Strategy } from "../../domain/aggregates/strategy.aggregate";

jest.mock("@rmsm/database", () => {
  const txMock = {
    strategy: { findUnique: jest.fn(), updateMany: jest.fn(), create: jest.fn() },
    strategyTagAssignment: { findMany: jest.fn().mockResolvedValue([]), deleteMany: jest.fn(), create: jest.fn() },
    strategyTag: { upsert: jest.fn() },
  };
  return {
    prisma: {
      strategy: { findFirst: jest.fn(), findMany: jest.fn(), count: jest.fn() },
      $transaction: jest.fn((fn: (tx: typeof txMock) => unknown) => fn(txMock)),
      __txMock: txMock,
    },
    // Milestone 2 fix — the real Prisma-generated runtime enum const
    // objects `enum-mappers.util.ts` now imports and dereferences
    // (`StrategyCategoryCode.MEAN_REVERSION` etc., not a raw string
    // cast). A `jest.mock` factory replaces the ENTIRE module — any
    // export the code under test actually uses must be present here
    // too, or it resolves to `undefined` at runtime, exactly the
    // failure this fix corrects.
    StrategyStatus: { ACTIVE: "ACTIVE", ARCHIVED: "ARCHIVED" },
    StrategyCategoryCode: { TREND_FOLLOWING: "TREND_FOLLOWING", MEAN_REVERSION: "MEAN_REVERSION", MOMENTUM: "MOMENTUM", BREAKOUT: "BREAKOUT", SCALPING: "SCALPING", SWING: "SWING", ARBITRAGE: "ARBITRAGE", MARKET_MAKING: "MARKET_MAKING", CUSTOM: "CUSTOM" },
  };
});

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { prisma } = require("@rmsm/database") as {
  prisma: {
    strategy: { findFirst: jest.Mock; findMany: jest.Mock; count: jest.Mock };
    $transaction: jest.Mock;
    __txMock: { strategy: { findUnique: jest.Mock; updateMany: jest.Mock; create: jest.Mock }; strategyTagAssignment: { findMany: jest.Mock; deleteMany: jest.Mock; create: jest.Mock }; strategyTag: { upsert: jest.Mock } };
  };
};

function buildStrategy(overrides: Partial<{ tags: string[] }> = {}): Strategy {
  return new Strategy("strat1", "org1", "RSI Strategy", "desc", "MEAN_REVERSION", overrides.tags ?? [], "ACTIVE", null, "user1", new Date());
}

describe("StrategyRepository", () => {
  let repository: StrategyRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.__txMock.strategyTagAssignment.findMany.mockResolvedValue([]);
    repository = new StrategyRepository();
  });

  describe("save() — optimistic concurrency", () => {
    it("creates a new row when the strategy doesn't already exist", async () => {
      prisma.__txMock.strategy.findUnique.mockResolvedValue(null);
      await repository.save(buildStrategy());
      expect(prisma.__txMock.strategy.create).toHaveBeenCalled();
      expect(prisma.__txMock.strategy.updateMany).not.toHaveBeenCalled();
    });

    it("updates with a WHERE clause on the last-read version, and increments it", async () => {
      prisma.__txMock.strategy.findUnique.mockResolvedValue({ version: 3 });
      prisma.__txMock.strategy.updateMany.mockResolvedValue({ count: 1 });
      await repository.save(buildStrategy());
      expect(prisma.__txMock.strategy.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ id: "strat1", version: 3 }), data: expect.objectContaining({ version: { increment: 1 } }) }),
      );
    });

    it("throws a real, clear error when the version check finds zero matching rows — a genuine concurrent-write conflict, not silently overwritten", async () => {
      prisma.__txMock.strategy.findUnique.mockResolvedValue({ version: 3 });
      prisma.__txMock.strategy.updateMany.mockResolvedValue({ count: 0 });
      await expect(repository.save(buildStrategy())).rejects.toThrow(/concurrency conflict/);
    });
  });

  describe("save() — tag reconciliation", () => {
    it("adds a newly-added tag via upsert + create", async () => {
      prisma.__txMock.strategy.findUnique.mockResolvedValue(null);
      prisma.__txMock.strategyTag.upsert.mockResolvedValue({ id: "tag1", name: "backtested" });
      await repository.save(buildStrategy({ tags: ["backtested"] }));
      expect(prisma.__txMock.strategyTag.upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { name: "backtested" } }));
      expect(prisma.__txMock.strategyTagAssignment.create).toHaveBeenCalledWith({ data: { strategyId: "strat1", tagId: "tag1" } });
    });

    it("removes a tag no longer present on the aggregate, without touching tags that are still present", async () => {
      prisma.__txMock.strategy.findUnique.mockResolvedValue(null);
      prisma.__txMock.strategyTagAssignment.findMany.mockResolvedValue([
        { tagId: "tag-keep", tag: { name: "keep-me" } },
        { tagId: "tag-remove", tag: { name: "remove-me" } },
      ]);
      await repository.save(buildStrategy({ tags: ["keep-me"] }));
      expect(prisma.__txMock.strategyTagAssignment.deleteMany).toHaveBeenCalledWith({ where: { strategyId: "strat1", tagId: { in: ["tag-remove"] } } });
    });

    it("makes no tag-mutation calls at all when the desired and current tag sets already match", async () => {
      prisma.__txMock.strategy.findUnique.mockResolvedValue(null);
      prisma.__txMock.strategyTagAssignment.findMany.mockResolvedValue([{ tagId: "tag1", tag: { name: "unchanged" } }]);
      await repository.save(buildStrategy({ tags: ["unchanged"] }));
      expect(prisma.__txMock.strategyTagAssignment.deleteMany).not.toHaveBeenCalled();
      expect(prisma.__txMock.strategyTagAssignment.create).not.toHaveBeenCalled();
    });
  });

  describe("findById()", () => {
    it("returns null when no row is found, not throwing", async () => {
      prisma.strategy.findFirst.mockResolvedValue(null);
      expect(await repository.findById("missing", "org1")).toBeNull();
    });

    it("scopes the query by both id AND organizationId — never a cross-tenant read", async () => {
      prisma.strategy.findFirst.mockResolvedValue(null);
      await repository.findById("strat1", "org1");
      expect(prisma.strategy.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ id: "strat1", organizationId: "org1" }) }));
    });

    it("excludes soft-deleted rows", async () => {
      prisma.strategy.findFirst.mockResolvedValue(null);
      await repository.findById("strat1", "org1");
      expect(prisma.strategy.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ deletedAt: null }) }));
    });
  });
});
