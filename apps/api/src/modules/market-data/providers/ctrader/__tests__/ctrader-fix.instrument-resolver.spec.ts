import { CTraderFixInstrumentResolver } from "../ctrader-fix.instrument-resolver";

describe("CTraderFixInstrumentResolver", () => {
  const entry = {
    providerInstrumentId: "1",
    providerSymbol: "EURUSD",
    name: "EURUSD",
    digits: 5,
  };

  it("resolves an existing provider alias to the canonical instrument", async () => {
    const alias = {
      id: "alias-1",
      instrumentId: "instrument-1",
      providerId: "provider-1",
      providerSymbol: "EURUSD",
      providerInstrumentId: "1",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const instrument = {
      id: "instrument-1",
      exchangeId: "exchange-forex",
      symbol: "EURUSD",
      name: "Euro / US Dollar",
      assetClass: "FOREX",
      status: "ACTIVE",
      currency: "USD",
      isin: null,
      cusip: null,
      tickSize: "0.00001",
      lotSize: "100000",
      listedAt: null,
      delistedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const findByProviderSymbol = jest
      .fn()
      .mockResolvedValue(alias);

    const findById = jest
      .fn()
      .mockResolvedValue(instrument);

    const resolver = new CTraderFixInstrumentResolver(
      {
        findByProviderSymbol,
      } as never,
      {
        findById,
      } as never,
    );

    const result = await resolver.resolve(
      "provider-1",
      entry,
    );

    expect(result).toEqual({
      instrument: {
        exchangeId: "exchange-forex",
        symbol: "EURUSD",
        name: "Euro / US Dollar",
        assetClass: "FOREX",
        currency: "USD",
        tickSize: "0.00001",
        lotSize: "100000",
      },
    });

    expect(findByProviderSymbol).toHaveBeenCalledWith(
      "provider-1",
      "EURUSD",
      undefined,
    );

    expect(findById).toHaveBeenCalledWith(
      "instrument-1",
      undefined,
    );
  });

  it("returns null when the provider alias does not exist", async () => {
    const findByProviderSymbol = jest
      .fn()
      .mockResolvedValue(null);

    const findById = jest.fn();

    const resolver = new CTraderFixInstrumentResolver(
      {
        findByProviderSymbol,
      } as never,
      {
        findById,
      } as never,
    );

    await expect(
      resolver.resolve("provider-1", entry),
    ).resolves.toBeNull();

    expect(findById).not.toHaveBeenCalled();
  });

  it("returns null when the alias points to a missing instrument", async () => {
    const findByProviderSymbol = jest
      .fn()
      .mockResolvedValue({
        instrumentId: "missing-instrument",
      });

    const findById = jest
      .fn()
      .mockResolvedValue(null);

    const resolver = new CTraderFixInstrumentResolver(
      {
        findByProviderSymbol,
      } as never,
      {
        findById,
      } as never,
    );

    await expect(
      resolver.resolve("provider-1", entry),
    ).resolves.toBeNull();
  });

  it("passes an explicit database client through both repository calls", async () => {
    const alias = {
      instrumentId: "instrument-1",
    };

    const instrument = {
      id: "instrument-1",
      exchangeId: null,
      symbol: "BTCUSD",
      name: "Bitcoin / US Dollar",
      assetClass: "CRYPTO",
      status: "ACTIVE",
      currency: "USD",
      isin: null,
      cusip: null,
      tickSize: null,
      lotSize: null,
      listedAt: null,
      delistedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const findByProviderSymbol = jest
      .fn()
      .mockResolvedValue(alias);

    const findById = jest
      .fn()
      .mockResolvedValue(instrument);

    const resolver = new CTraderFixInstrumentResolver(
      {
        findByProviderSymbol,
      } as never,
      {
        findById,
      } as never,
    );

    const client = {} as never;

    await resolver.resolve(
      "provider-1",
      {
        providerInstrumentId: "55",
        providerSymbol: "BTCUSD",
        name: "BTCUSD",
        digits: 2,
      },
      client,
    );

    expect(findByProviderSymbol).toHaveBeenCalledWith(
      "provider-1",
      "BTCUSD",
      client,
    );

    expect(findById).toHaveBeenCalledWith(
      "instrument-1",
      client,
    );
  });
});
