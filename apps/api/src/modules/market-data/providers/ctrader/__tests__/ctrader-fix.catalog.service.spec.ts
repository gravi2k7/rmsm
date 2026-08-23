import { CTraderInstrumentCatalogService } from "../ctrader-fix.catalog.service";

describe("CTraderInstrumentCatalogService", () => {
  it("requests the catalog and passes it to the synchronizer", async () => {
    const catalog = {
      requestId: "SECURITY-LIST-001",
      receivedAt: new Date(),
      instruments: [
        {
          providerInstrumentId: "1",
          providerSymbol: "EURUSD",
          name: "EURUSD",
          digits: 5,
        },
      ],
    };

    const requestInstrumentCatalog = jest
      .fn()
      .mockResolvedValue(catalog);

    const synchronize = jest
      .fn()
      .mockResolvedValue({
        providerId: "ctrader-provider",
        processed: 1,
        synchronized: 1,
        skipped: 0,
        aliases: 1,
      });

    const service = new CTraderInstrumentCatalogService(
      {
        requestInstrumentCatalog,
      } as never,
      {
        synchronize,
      } as never,
    );

    const resolver = jest.fn().mockResolvedValue({
      instrument: {
        exchangeId: null,
        symbol: "EURUSD",
        name: "EURUSD",
        assetClass: "FOREX",
        currency: "USD",
      },
    });

    const result = await service.synchronize(
      "ctrader-provider",
      resolver,
      15_000,
    );

    expect(requestInstrumentCatalog).toHaveBeenCalledWith(15_000);

    expect(synchronize).toHaveBeenCalledWith(
      "ctrader-provider",
      catalog,
      resolver,
      undefined,
    );

    expect(result).toEqual({
      providerId: "ctrader-provider",
      processed: 1,
      synchronized: 1,
      skipped: 0,
      aliases: 1,
    });
  });

  it("passes an explicit database client through to the synchronizer", async () => {
    const catalog = {
      requestId: "REQ-2",
      receivedAt: new Date(),
      instruments: [],
    };

    const requestInstrumentCatalog = jest
      .fn()
      .mockResolvedValue(catalog);

    const synchronize = jest
      .fn()
      .mockResolvedValue({
        providerId: "ctrader-provider",
        processed: 0,
        synchronized: 0,
        skipped: 0,
        aliases: 0,
      });

    const service = new CTraderInstrumentCatalogService(
      {
        requestInstrumentCatalog,
      } as never,
      {
        synchronize,
      } as never,
    );

    const dbClient = {} as never;
    const resolver = jest.fn();

    await service.synchronize(
      "ctrader-provider",
      resolver,
      undefined,
      dbClient,
    );

    expect(requestInstrumentCatalog).toHaveBeenCalledWith(undefined);

    expect(synchronize).toHaveBeenCalledWith(
      "ctrader-provider",
      catalog,
      resolver,
      dbClient,
    );
  });

  it("propagates catalog request failures", async () => {
    const error = new Error("Security List request failed");

    const requestInstrumentCatalog = jest
      .fn()
      .mockRejectedValue(error);

    const synchronize = jest.fn();

    const service = new CTraderInstrumentCatalogService(
      {
        requestInstrumentCatalog,
      } as never,
      {
        synchronize,
      } as never,
    );

    const resolver = jest.fn();

    await expect(
      service.synchronize(
        "ctrader-provider",
        resolver,
      ),
    ).rejects.toThrow("Security List request failed");

    expect(synchronize).not.toHaveBeenCalled();
  });

  it("does not resolve financial identity inside the service", async () => {
    const catalog = {
      requestId: "REQ-3",
      receivedAt: new Date(),
      instruments: [],
    };

    const requestInstrumentCatalog = jest
      .fn()
      .mockResolvedValue(catalog);

    const synchronize = jest
      .fn()
      .mockResolvedValue({
        providerId: "ctrader-provider",
        processed: 0,
        synchronized: 0,
        skipped: 0,
        aliases: 0,
      });

    const service = new CTraderInstrumentCatalogService(
      {
        requestInstrumentCatalog,
      } as never,
      {
        synchronize,
      } as never,
    );

    const resolver = jest.fn();

    await service.synchronize(
      "ctrader-provider",
      resolver,
    );

    expect(resolver).not.toHaveBeenCalled();
  });
});
