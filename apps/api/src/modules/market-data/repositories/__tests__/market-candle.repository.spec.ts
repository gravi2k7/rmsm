import { MarketCandleRepository } from "../market-candle.repository";

jest.mock("@rmsm/database", () => ({
  prisma: {
    marketCandle: {
      upsert: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { prisma } = require("@rmsm/database") as {
  prisma: {
    marketCandle: {
      upsert: jest.Mock;
      create: jest.Mock;
      findUnique: jest.Mock;
      findMany: jest.Mock;
    };
  };
};

describe("MarketCandleRepository", () => {
  let repository: MarketCandleRepository;

  const baseInput = {
    instrumentId: "inst1",
    interval: "ONE_MINUTE" as const,
    eventTime: new Date("2026-01-01T00:00:00Z"),
    open: "100.5",
    high: "101.0",
    low: "100.0",
    close: "100.8",
    volume: "5000",
    providerId: "prov1",
    source: "LIVE" as const,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new MarketCandleRepository();
  });

  describe("upsert", () => {
    it("uses the compound unique key [instrumentId, interval, eventTime, source]", async () => {
      prisma.marketCandle.upsert.mockResolvedValue({
        id: "c1",
        ...baseInput,
        open: { toString: () => "100.5" },
        high: { toString: () => "101.0" },
        low: { toString: () => "100.0" },
        close: { toString: () => "100.8" },
        volume: { toString: () => "5000" },
        receivedAt: new Date(),
        importJobId: null,
        sourceTimestamp: null,
        normalizationVersion: 1,
        isCorrection: false,
        supersedesId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await repository.upsert(baseInput);

      expect(prisma.marketCandle.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            instrumentId_interval_eventTime_source: {
              instrumentId: "inst1",
              interval: "ONE_MINUTE",
              eventTime: baseInput.eventTime,
              source: "LIVE",
            },
          },
        }),
      );
    });

    it("returns a domain model with string prices, not Prisma Decimal objects", async () => {
      prisma.marketCandle.upsert.mockResolvedValue({
        id: "c1",
        ...baseInput,
        open: { toString: () => "100.5" },
        high: { toString: () => "101.0" },
        low: { toString: () => "100.0" },
        close: { toString: () => "100.8" },
        volume: { toString: () => "5000" },
        receivedAt: new Date(),
        importJobId: null,
        sourceTimestamp: null,
        normalizationVersion: 1,
        isCorrection: false,
        supersedesId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await repository.upsert(baseInput);

      expect(typeof result.open).toBe("string");
      expect(result.open).toBe("100.5");
      expect(typeof result.volume).toBe("string");
    });
  });

  describe("createCorrection", () => {
    it("always calls create, never upsert — a correction is never an update to the row it replaces", async () => {
      prisma.marketCandle.create.mockResolvedValue({
        id: "c2",
        ...baseInput,
        open: { toString: () => "100.5" },
        high: { toString: () => "101.0" },
        low: { toString: () => "100.0" },
        close: { toString: () => "100.8" },
        volume: { toString: () => "5000" },
        receivedAt: new Date(),
        importJobId: null,
        sourceTimestamp: null,
        normalizationVersion: 2,
        isCorrection: true,
        supersedesId: "c1",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await repository.createCorrection({ ...baseInput, supersedesId: "c1" });

      expect(prisma.marketCandle.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ supersedesId: "c1", isCorrection: true }),
      });
      expect(prisma.marketCandle.upsert).not.toHaveBeenCalled();
    });
  });

  describe("findRangeCurrentValues", () => {
    it("excludes superseded rows via supersededBy: null", async () => {
      prisma.marketCandle.findMany.mockResolvedValue([]);
      await repository.findRangeCurrentValues({
        instrumentId: "inst1",
        interval: "ONE_MINUTE",
        from: new Date("2026-01-01T00:00:00Z"),
        to: new Date("2026-01-02T00:00:00Z"),
        limit: 100,
      });
      const callArg = prisma.marketCandle.findMany.mock.calls[0][0];
      expect(callArg.where.supersededBy).toBeNull();
    });
  });

    it("returns LIVE when LIVE and BACKFILL share the same timestamp", async () => {
      const eventTime = new Date("2026-01-01T00:01:00Z");

      const live = {
        ...baseInput,
        id: "live-1",
        eventTime,
        source: "LIVE",
        open: { toString: () => "100" },
        high: { toString: () => "101" },
        low: { toString: () => "99" },
        close: { toString: () => "100.5" },
        volume: { toString: () => "1000" },
        receivedAt: new Date("2026-01-01T00:02:00Z"),
        updatedAt: new Date("2026-01-01T00:02:00Z"),
        createdAt: new Date("2026-01-01T00:02:00Z"),
        importJobId: null,
        sourceTimestamp: null,
        normalizationVersion: 1,
        isCorrection: false,
        supersedesId: null,
      };

      const backfill = {
        ...live,
        id: "backfill-1",
        source: "BACKFILL",
        open: { toString: () => "98" },
        high: { toString: () => "99" },
        low: { toString: () => "97" },
        close: { toString: () => "98.5" },
        volume: { toString: () => "500" },
      };

      prisma.marketCandle.findMany.mockResolvedValue([
        backfill,
        live,
      ]);

      const result = await repository.findRangeCurrentValues({
        instrumentId: "inst1",
        interval: "ONE_MINUTE",
        from: new Date("2026-01-01T00:00:00Z"),
        to: new Date("2026-01-01T01:00:00Z"),
        limit: 100,
      });

      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe("live-1");
      expect(result[0]!.source).toBe("LIVE");
    });

    it("returns one canonical candle per timestamp in chronological order", async () => {
      const candle1 = {
        ...baseInput,
        id: "c1",
        eventTime: new Date("2026-01-01T00:01:00Z"),
        source: "LIVE",
        receivedAt: new Date(),
        updatedAt: new Date(),
        createdAt: new Date(),
        importJobId: null,
        sourceTimestamp: null,
        normalizationVersion: 1,
        isCorrection: false,
        supersedesId: null,
        open: { toString: () => "1" },
        high: { toString: () => "2" },
        low: { toString: () => "0" },
        close: { toString: () => "1" },
        volume: { toString: () => "10" },
      };

      const candle2 = {
        ...candle1,
        id: "c2",
        eventTime: new Date("2026-01-01T00:02:00Z"),
      };

      const duplicateBackfill = {
        ...candle2,
        id: "c2-backfill",
        source: "BACKFILL",
      };

      prisma.marketCandle.findMany.mockResolvedValue([
        duplicateBackfill,
        candle2,
        candle1,
      ]);

      const result = await repository.findRangeCurrentValues({
        instrumentId: "inst1",
        interval: "ONE_MINUTE",
        from: new Date("2026-01-01T00:00:00Z"),
        to: new Date("2026-01-01T01:00:00Z"),
        limit: 100,
      });

      expect(result).toHaveLength(2);
      expect(result.map((candle) => candle.id)).toEqual(["c1", "c2"]);
      expect(result.map((candle) => candle.source)).toEqual([
        "LIVE",
        "LIVE",
      ]);
    });

  describe("findCorrectionChain", () => {
    it("walks the supersedesId chain back to the original row, oldest first", async () => {
      const original = { ...baseInput, id: "c1", supersedesId: null, open: { toString: () => "1" }, high: { toString: () => "1" }, low: { toString: () => "1" }, close: { toString: () => "1" }, volume: { toString: () => "1" }, receivedAt: new Date(), importJobId: null, sourceTimestamp: null, normalizationVersion: 1, isCorrection: false, createdAt: new Date(), updatedAt: new Date() };
      const correction = { ...original, id: "c2", supersedesId: "c1", isCorrection: true };

      prisma.marketCandle.findUnique
        .mockResolvedValueOnce(correction) // first call: the starting candleId
        .mockResolvedValueOnce(original); // second call: walking back via supersedesId

      const chain = await repository.findCorrectionChain("c2");

      expect(chain.map((c) => c.id)).toEqual(["c1", "c2"]); // oldest first
      expect(prisma.marketCandle.findUnique).toHaveBeenCalledTimes(2);
    });

    it("stops without error when the starting id doesn't exist", async () => {
      prisma.marketCandle.findUnique.mockResolvedValueOnce(null);
      const chain = await repository.findCorrectionChain("does-not-exist");
      expect(chain).toEqual([]);
    });
  });
});
