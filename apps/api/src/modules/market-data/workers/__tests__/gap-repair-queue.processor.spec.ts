import {
  CandleInterval,
  DataGapStatus,
  MarketDataSource,
} from "@rmsm/database";
import { GapRepairQueueProcessor } from "../gap-repair-queue.processor";

describe("GapRepairQueueProcessor", () => {
  const instrumentId = "instrument-1";
  const providerId = "provider-1";

  const candle = (minute: number) => ({
    id: `candle-${minute}`,
    instrumentId,
    interval: CandleInterval.ONE_MINUTE,
    eventTime: new Date(
      `2026-09-20T10:${String(minute).padStart(2, "0")}:00.000Z`,
    ),
    open: "100",
    high: "101",
    low: "99",
    close: "100",
    volume: "1",
    providerId,
    source: MarketDataSource.LIVE,
    receivedAt: new Date(),
    importJobId: null,
    sourceTimestamp: null,
    normalizationVersion: 1,
    isCorrection: false,
    supersedesId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const makeProcessor = () => {
    const instrumentRepository = {
      search: jest.fn(),
    };

    const candleRepository = {
      findRangeCurrentValues: jest.fn(),
      upsertBackfill: jest.fn(),
    };

    const dataGapRepository = {
      findOverlapping: jest.fn(),
      create: jest.fn(),
      incrementRepairAttempts: jest.fn(),
      markStatus: jest.fn(),
    };

    const gapDetectionService = {
      detectGaps: jest.fn(),
    };

    const backfillWorkflow = {
      execute: jest.fn(),
    };

    const candleAggregationService = {
      aggregateFromOneMinute: jest.fn(),
    };

    const tradingScheduleService = {
      getScheduleForInstrument: jest.fn().mockResolvedValue(null),
      isTradingTime: jest.fn(),
    };

    const processor = new GapRepairQueueProcessor(
      instrumentRepository as any,
      candleRepository as any,
      dataGapRepository as any,
      gapDetectionService as any,
      backfillWorkflow as any,
      candleAggregationService as any,
      tradingScheduleService as any,
    );

    return {
      processor,
      candleRepository,
      dataGapRepository,
      gapDetectionService,
      backfillWorkflow,
      candleAggregationService,
      tradingScheduleService,
    };
  };

  it(
    "repairs missing one-minute source candles before aggregating " +
      "a higher timeframe",
    async () => {
      const {
        processor,
        candleRepository,
        dataGapRepository,
        gapDetectionService,
        backfillWorkflow,
        candleAggregationService,
      } = makeProcessor();

      const higherGap = {
        id: "gap-5m",
        instrumentId,
        interval: CandleInterval.FIVE_MINUTES,
        gapStart: new Date("2026-09-20T10:00:00.000Z"),
        gapEnd: new Date("2026-09-20T10:00:00.000Z"),
        status: DataGapStatus.DETECTED,
      };

      const oneMinuteGap = {
        id: "gap-1m",
        instrumentId,
        interval: CandleInterval.ONE_MINUTE,
        gapStart: new Date("2026-09-20T10:00:00.000Z"),
        gapEnd: new Date("2026-09-20T10:00:00.000Z"),
        status: DataGapStatus.DETECTED,
      };

      /*
       * Return data according to the requested interval instead of relying
       * on call order. This keeps the test aligned with the repository
       * contract used by scanDerivedInterval().
       */
      candleRepository.findRangeCurrentValues.mockImplementation(
        async (query: { interval: CandleInterval }) => {
          if (query.interval === CandleInterval.FIVE_MINUTES) {
            return [];
          }

          if (query.interval === CandleInterval.ONE_MINUTE) {
            const oneMinuteCalls =
              candleRepository.findRangeCurrentValues.mock.calls.filter(
                ([call]) =>
                  call?.interval === CandleInterval.ONE_MINUTE,
              ).length;

            if (oneMinuteCalls === 1) {
              return [
                candle(1),
                candle(2),
                candle(3),
                candle(4),
              ];
            }

            return [
              candle(0),
              candle(1),
              candle(2),
              candle(3),
              candle(4),
            ];
          }

          return [];
        },
      );

      gapDetectionService.detectGaps.mockReturnValue([
        {
          interval: CandleInterval.FIVE_MINUTES,
          gapStart: new Date("2026-09-20T10:00:00.000Z"),
          gapEnd: new Date("2026-09-20T10:00:00.000Z"),
        },
      ]);

      dataGapRepository.findOverlapping.mockResolvedValue([]);

      /*
       * First create() is the HTF gap.
       * Second create() is the underlying 1m gap.
       */
      dataGapRepository.create
        .mockResolvedValueOnce(higherGap)
        .mockResolvedValueOnce(oneMinuteGap);

      backfillWorkflow.execute.mockResolvedValue({
        gap: oneMinuteGap,
        candlesBackfilled: 1,
        succeeded: true,
      });

      candleAggregationService.aggregateFromOneMinute.mockReturnValue({
        interval: CandleInterval.FIVE_MINUTES,
        eventTime: new Date("2026-09-20T10:00:00.000Z"),
        open: "100",
        high: "101",
        low: "99",
        close: "100",
        volume: "5",
        providerId,
        sourceTimestamp: undefined,
      });

      candleRepository.upsertBackfill.mockResolvedValue({});

      const result = await (processor as any).scanDerivedInterval(
        instrumentId,
        CandleInterval.FIVE_MINUTES,
      );

      expect(backfillWorkflow.execute).toHaveBeenCalledWith({
        instrumentId,
        gapId: "gap-1m",
      });

      expect(candleAggregationService.aggregateFromOneMinute).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            interval: CandleInterval.ONE_MINUTE,
          }),
        ]),
        CandleInterval.FIVE_MINUTES,
        new Date("2026-09-20T10:00:00.000Z"),
      );

      expect(candleRepository.upsertBackfill).toHaveBeenCalledWith(
        expect.objectContaining({
          instrumentId,
          interval: CandleInterval.FIVE_MINUTES,
          eventTime: new Date("2026-09-20T10:00:00.000Z"),
          open: "100",
          high: "101",
          low: "99",
          close: "100",
          volume: "5",
          providerId,
        }),
      );

      expect(dataGapRepository.markStatus).toHaveBeenCalledWith(
        "gap-5m",
        DataGapStatus.RESOLVED,
      );

      expect(result).toEqual({
        detected: 1,
        repaired: 1,
        unresolved: 0,
      });
    },
  );

  it(
    "does not aggregate a higher timeframe when one-minute repair fails",
    async () => {
      const {
        processor,
        candleRepository,
        dataGapRepository,
        gapDetectionService,
        backfillWorkflow,
        candleAggregationService,
      } = makeProcessor();

      const higherGap = {
        id: "gap-5m",
        instrumentId,
        interval: CandleInterval.FIVE_MINUTES,
        gapStart: new Date("2026-09-20T10:00:00.000Z"),
        gapEnd: new Date("2026-09-20T10:00:00.000Z"),
        status: DataGapStatus.DETECTED,
      };

      const oneMinuteGap = {
        id: "gap-1m",
        instrumentId,
        interval: CandleInterval.ONE_MINUTE,
        gapStart: new Date("2026-09-20T10:00:00.000Z"),
        gapEnd: new Date("2026-09-20T10:00:00.000Z"),
        status: DataGapStatus.DETECTED,
      };

      candleRepository.findRangeCurrentValues
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          candle(1),
          candle(2),
          candle(3),
          candle(4),
        ])
        .mockResolvedValueOnce([
          candle(1),
          candle(2),
          candle(3),
          candle(4),
        ]);

      gapDetectionService.detectGaps.mockReturnValue([
        {
          interval: CandleInterval.FIVE_MINUTES,
          gapStart: new Date("2026-09-20T10:00:00.000Z"),
          gapEnd: new Date("2026-09-20T10:00:00.000Z"),
        },
      ]);

      dataGapRepository.findOverlapping.mockResolvedValue([]);

      dataGapRepository.create
        .mockResolvedValueOnce(higherGap)
        .mockResolvedValueOnce(oneMinuteGap);

      backfillWorkflow.execute.mockResolvedValue({
        gap: oneMinuteGap,
        candlesBackfilled: 0,
        succeeded: false,
        failureReason: "provider unavailable",
      });

      const result = await (processor as any).scanDerivedInterval(
        instrumentId,
        CandleInterval.FIVE_MINUTES,
      );

      expect(backfillWorkflow.execute).toHaveBeenCalledWith({
        instrumentId,
        gapId: "gap-1m",
      });

      expect(candleAggregationService.aggregateFromOneMinute)
        .not.toHaveBeenCalled();

      expect(candleRepository.upsertBackfill)
        .not.toHaveBeenCalled();

      expect(dataGapRepository.markStatus).toHaveBeenCalledWith(
        "gap-5m",
        DataGapStatus.UNRESOLVED,
      );

      expect(result).toEqual({
        detected: 1,
        repaired: 0,
        unresolved: 1,
      });
    },
  );

  it(
    "does not repair one-minute candles during a closed cTrader session",
    async () => {
      const {
        processor,
        candleRepository,
        dataGapRepository,
        backfillWorkflow,
        tradingScheduleService,
      } = makeProcessor();

      const schedule = {
        symbolId: 1,
        timezone: "UTC",
        intervals: [
          {
            startSecond: 9 * 60 * 60,
            endSecond: 17 * 60 * 60,
          },
        ],
        fetchedAt: new Date(),
      };

      tradingScheduleService.getScheduleForInstrument.mockResolvedValue(
        schedule,
      );

      tradingScheduleService.isTradingTime.mockImplementation(
        (timestamp: Date) => {
          const hour = timestamp.getUTCHours();
          return hour >= 9 && hour < 17;
        },
      );

      candleRepository.findRangeCurrentValues.mockResolvedValue([]);

      dataGapRepository.findOverlapping.mockResolvedValue([]);

      dataGapRepository.create.mockResolvedValue({
        id: "gap-1m-session",
        instrumentId,
        interval: CandleInterval.ONE_MINUTE,
        gapStart: new Date("2026-09-20T09:00:00.000Z"),
        gapEnd: new Date("2026-09-20T09:01:00.000Z"),
        status: DataGapStatus.DETECTED,
      });

      backfillWorkflow.execute.mockResolvedValue({
        gap: {
          id: "gap-1m-session",
          instrumentId,
          interval: CandleInterval.ONE_MINUTE,
          gapStart: new Date("2026-09-20T09:00:00.000Z"),
          gapEnd: new Date("2026-09-20T09:01:00.000Z"),
          status: DataGapStatus.DETECTED,
        },
        candlesBackfilled: 0,
        succeeded: false,
        failureReason: "closed-session regression test",
      });

      await (processor as any).ensureOneMinuteCoverage(
        instrumentId,
        new Date("2026-09-20T08:59:00.000Z"),
        new Date("2026-09-20T09:01:00.000Z"),
      );

      expect(dataGapRepository.create).toHaveBeenCalledTimes(1);

      const createdGap =
        dataGapRepository.create.mock.calls[0][0];

      expect(createdGap.gapStart).toEqual(
        new Date("2026-09-20T09:00:00.000Z"),
      );

      expect(createdGap.gapEnd).toEqual(
        new Date("2026-09-20T09:01:00.000Z"),
      );
    },
  );

});
