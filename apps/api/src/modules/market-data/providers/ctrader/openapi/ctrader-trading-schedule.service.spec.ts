import { MarketDataProviderType } from "@rmsm/database";

import { CTraderTradingScheduleService } from "./ctrader-trading-schedule.service";

describe("CTraderTradingScheduleService", () => {
  const client = {
    accountId: 987654,
    requestSymbolDetails: jest.fn(),
  };

  const aliasRepository = {
    findByInstrument: jest.fn(),
  };

  const providerConfigRepository = {
    findByType: jest.fn(),
  };

  const service = new CTraderTradingScheduleService(
    client as never,
    aliasRepository as never,
    providerConfigRepository as never,
  );

  const schedule = {
    symbolId: 1,
    timezone: "UTC",
    intervals: [
      {
        startSecond: 1 * 24 * 60 * 60 + 9 * 60 * 60,
        endSecond: 1 * 24 * 60 * 60 + 17 * 60 * 60,
      },
    ],
    fetchedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service.clearCache();
  });

  it("converts Sunday 00:00 UTC to second zero", () => {
    expect(
      service.getSecondOfWeek(
        new Date("2026-09-20T00:00:00.000Z"),
        "UTC",
      ),
    ).toBe(0);
  });

  it("converts Monday 09:30 UTC correctly", () => {
    expect(
      service.getSecondOfWeek(
        new Date("2026-09-21T09:30:00.000Z"),
        "UTC",
      ),
    ).toBe(
      1 * 24 * 60 * 60 +
        9 * 60 * 60 +
        30 * 60,
    );
  });

  it("includes interval start and excludes interval end", () => {
    expect(
      service.isTradingTime(
        new Date("2026-09-21T09:00:00.000Z"),
        schedule,
      ),
    ).toBe(true);

    expect(
      service.isTradingTime(
        new Date("2026-09-21T17:00:00.000Z"),
        schedule,
      ),
    ).toBe(false);
  });

  it("handles New York DST", () => {
    const dstSchedule = {
      ...schedule,
      timezone: "America/New_York",
    };

    // Monday 09:00 New York during EDT = 13:00 UTC.
    expect(
      service.isTradingTime(
        new Date("2026-07-06T13:00:00.000Z"),
        dstSchedule,
      ),
    ).toBe(true);
  });

  it("handles London DST", () => {
    const londonSchedule = {
      ...schedule,
      timezone: "Europe/London",
    };

    // Monday 09:00 London during BST = 08:00 UTC.
    expect(
      service.isTradingTime(
        new Date("2026-07-06T08:00:00.000Z"),
        londonSchedule,
      ),
    ).toBe(true);
  });

  it("does not treat Saturday as Monday", () => {
    expect(
      service.isTradingTime(
        new Date("2026-09-26T10:00:00.000Z"),
        schedule,
      ),
    ).toBe(false);
  });

  it("resolves an RMSM instrument to its cTrader symbol and fetches its schedule", async () => {
    providerConfigRepository.findByType.mockResolvedValue({
      id: "ctrader-provider-id",
    });

    aliasRepository.findByInstrument.mockResolvedValue([
      {
        instrumentId: "rmsm-instrument-1",
        providerId: "ctrader-provider-id",
        providerSymbol: "Sugar",
        providerInstrumentId: "12345",
      },
    ]);

    client.requestSymbolDetails.mockResolvedValue({
      symbol: [
        {
          symbolId: "12345",
          scheduleTimeZone: "America/New_York",
          schedule: [
            {
              startSecond: 100,
              endSecond: 200,
            },
          ],
        },
      ],
    });

    const result =
      await service.getScheduleForInstrument(
        "rmsm-instrument-1",
      );

    expect(
      providerConfigRepository.findByType,
    ).toHaveBeenCalledWith(
      MarketDataProviderType.CTRADER,
    );

    expect(
      aliasRepository.findByInstrument,
    ).toHaveBeenCalledWith(
      "rmsm-instrument-1",
    );

    expect(
      client.requestSymbolDetails,
    ).toHaveBeenCalledWith({
      accountId: 987654,
      symbolIds: [12345],
    });

    expect(result).toEqual(
      expect.objectContaining({
        symbolId: 12345,
        timezone: "America/New_York",
        intervals: [
          {
            startSecond: 100,
            endSecond: 200,
          },
        ],
      }),
    );
  });

  it("returns true when schedule metadata is unavailable", async () => {
    providerConfigRepository.findByType.mockResolvedValue(null);

    await expect(
      service.isTradingTimeForInstrument(
        "rmsm-instrument-1",
        new Date("2026-09-20T18:00:00.000Z"),
      ),
    ).resolves.toBe(true);
  });

  it("returns true when cTrader returns an empty trading schedule", async () => {
    providerConfigRepository.findByType.mockResolvedValue({
      id: "ctrader-provider-id",
    });

    aliasRepository.findByInstrument.mockResolvedValue([
      {
        instrumentId: "rmsm-instrument-1",
        providerId: "ctrader-provider-id",
        providerSymbol: "Sugar",
        providerInstrumentId: "12345",
      },
    ]);

    client.requestSymbolDetails.mockResolvedValue({
      symbol: [
        {
          symbolId: "12345",
          scheduleTimeZone: "America/New_York",
          schedule: [],
        },
      ],
    });

    await expect(
      service.isTradingTimeForInstrument(
        "rmsm-instrument-1",
        new Date("2026-09-21T14:00:00.000Z"),
      ),
    ).resolves.toBe(true);
  });
});
