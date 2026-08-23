import { CTraderInstrumentCatalogSynchronizer } from "../ctrader-fix.catalog-synchronizer";

import type { CTraderInstrumentCatalog } from "../ctrader-fix.types";

describe("CTraderInstrumentCatalogSynchronizer", () => {
  function buildCatalog(): CTraderInstrumentCatalog {
    return {
      requestId: "SECURITY-LIST-001",
      receivedAt: new Date("2026-08-21T06:05:12.161Z"),
      instruments: [
        {
          providerInstrumentId: "1",
          providerSymbol: "EURUSD",
          name: "EURUSD",
          digits: 5,
        },
        {
          providerInstrumentId: "2",
          providerSymbol: "XAUUSD",
          name: "XAUUSD",
          digits: 2,
        },
        {
          providerInstrumentId: "3",
          providerSymbol: "NAS100",
          name: "NAS100",
          digits: 1,
        },
      ],
    };
  }

  function buildResolution(symbol: string) {
    return {
      instrument: {
        exchangeId: null,
        symbol,
        name: symbol,
        assetClass: "FOREX" as const,
        currency: "USD",
      },
    };
  }

  it("synchronizes every resolved catalog entry", async () => {
    const instrumentUpsert = jest
      .fn()
      .mockImplementation(async (data) => ({
        id: `instrument-${data.symbol}`,
        ...data,
      }));

    const aliasUpsert = jest.fn().mockResolvedValue({
      id: "alias-id",
    });

    const instruments = {
      upsert: instrumentUpsert,
    } as never;

    const aliases = {
      upsert: aliasUpsert,
    } as never;

    const synchronizer =
      new CTraderInstrumentCatalogSynchronizer(
        instruments,
        aliases,
      );

    const resolve = jest
      .fn()
      .mockImplementation(async (entry) =>
        buildResolution(entry.providerSymbol),
      );

    const result = await synchronizer.synchronize(
      "ctrader-provider-id",
      buildCatalog(),
      resolve,
    );

    expect(result).toEqual({
      providerId: "ctrader-provider-id",
      processed: 3,
      synchronized: 3,
      skipped: 0,
      aliases: 3,
    });

    expect(resolve).toHaveBeenCalledTimes(3);
    expect(instrumentUpsert).toHaveBeenCalledTimes(3);
    expect(aliasUpsert).toHaveBeenCalledTimes(3);
  });

  it("passes canonical instrument data returned by the resolver to InstrumentRepository", async () => {
    const instrumentUpsert = jest
      .fn()
      .mockResolvedValue({
        id: "instrument-eurusd",
      });

    const aliasUpsert = jest.fn().mockResolvedValue({
      id: "alias-eurusd",
    });

    const synchronizer =
      new CTraderInstrumentCatalogSynchronizer(
        { upsert: instrumentUpsert } as never,
        { upsert: aliasUpsert } as never,
      );

    const resolution = buildResolution("EURUSD");

    const resolve = jest.fn().mockResolvedValue(resolution);

    await synchronizer.synchronize(
      "ctrader-provider-id",
      {
        requestId: "REQ-1",
        receivedAt: new Date(),
        instruments: [buildCatalog().instruments[0]!],
      },
      resolve,
    );

    expect(instrumentUpsert).toHaveBeenCalledWith(
      resolution.instrument,
      undefined,
    );
  });

  it("persists the cTrader provider instrument identity in the alias", async () => {
    const instrumentUpsert = jest
      .fn()
      .mockResolvedValue({
        id: "instrument-xauusd",
      });

    const aliasUpsert = jest.fn().mockResolvedValue({
      id: "alias-xauusd",
    });

    const synchronizer =
      new CTraderInstrumentCatalogSynchronizer(
        { upsert: instrumentUpsert } as never,
        { upsert: aliasUpsert } as never,
      );

    const entry = buildCatalog().instruments[1]!;

    await synchronizer.synchronize(
      "ctrader-provider-id",
      {
        requestId: "REQ-2",
        receivedAt: new Date(),
        instruments: [entry],
      },
      jest.fn().mockResolvedValue(buildResolution("XAUUSD")),
    );

    expect(aliasUpsert).toHaveBeenCalledWith(
      {
        instrumentId: "instrument-xauusd",
        providerId: "ctrader-provider-id",
        providerSymbol: "XAUUSD",
        providerInstrumentId: "2",
      },
      undefined,
    );
  });

  it("skips catalog entries that cannot be resolved", async () => {
    const instrumentUpsert = jest
      .fn()
      .mockImplementation(async (data) => ({
        id: `instrument-${data.symbol}`,
        ...data,
      }));

    const aliasUpsert = jest
      .fn()
      .mockResolvedValue({
        id: "alias-id",
      });

    const synchronizer =
      new CTraderInstrumentCatalogSynchronizer(
        { upsert: instrumentUpsert } as never,
        { upsert: aliasUpsert } as never,
      );

    const resolve = jest
      .fn()
      .mockResolvedValueOnce(buildResolution("EURUSD"))
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(buildResolution("NAS100"));

    const result = await synchronizer.synchronize(
      "ctrader-provider-id",
      buildCatalog(),
      resolve,
    );

    expect(result).toEqual({
      providerId: "ctrader-provider-id",
      processed: 3,
      synchronized: 2,
      skipped: 1,
      aliases: 2,
    });

    expect(instrumentUpsert).toHaveBeenCalledTimes(2);
    expect(aliasUpsert).toHaveBeenCalledTimes(2);
  });

  it("handles an empty catalog without invoking the resolver", async () => {
    const resolve = jest.fn();

    const synchronizer =
      new CTraderInstrumentCatalogSynchronizer(
        { upsert: jest.fn() } as never,
        { upsert: jest.fn() } as never,
      );

    const result = await synchronizer.synchronize(
      "ctrader-provider-id",
      {
        requestId: "EMPTY",
        receivedAt: new Date(),
        instruments: [],
      },
      resolve,
    );

    expect(result).toEqual({
      providerId: "ctrader-provider-id",
      processed: 0,
      synchronized: 0,
      skipped: 0,
      aliases: 0,
    });

    expect(resolve).not.toHaveBeenCalled();
  });
});
