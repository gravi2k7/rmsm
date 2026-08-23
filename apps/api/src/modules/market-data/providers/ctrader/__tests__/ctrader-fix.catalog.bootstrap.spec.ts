import { CTraderInstrumentCatalogBootstrapService } from "../ctrader-fix.catalog.bootstrap";

describe("CTraderInstrumentCatalogBootstrapService", () => {
  it("orchestrates catalog synchronization with provider identity and resolver", async () => {
    const result = {
      providerId: "ctrader-provider-id",
      processed: 3,
      synchronized: 2,
      skipped: 1,
      aliases: 2,
    };

    const synchronize = jest.fn().mockResolvedValue(result);

    const service =
      new CTraderInstrumentCatalogBootstrapService(
        { synchronize } as never,
        {} as never,
      );

    const resolve = jest.fn();

    await expect(
      service.bootstrap({
        providerId: "ctrader-provider-id",
        resolve,
      }),
    ).resolves.toEqual(result);

    expect(synchronize).toHaveBeenCalledWith(
      "ctrader-provider-id",
      resolve,
      undefined,
      undefined,
    );
  });

  it("passes timeout and database client through unchanged", async () => {
    const synchronize = jest.fn().mockResolvedValue({
      providerId: "ctrader-provider-id",
      processed: 0,
      synchronized: 0,
      skipped: 0,
      aliases: 0,
    });

    const service =
      new CTraderInstrumentCatalogBootstrapService(
        { synchronize } as never,
        {} as never,
      );

    const resolve = jest.fn();
    const client = {} as never;

    await service.bootstrap({
      providerId: "ctrader-provider-id",
      resolve,
      timeoutMs: 15_000,
      client,
    });

    expect(synchronize).toHaveBeenCalledWith(
      "ctrader-provider-id",
      resolve,
      15_000,
      client,
    );
  });

  it("rejects an empty provider id", async () => {
    const synchronize = jest.fn();

    const service =
      new CTraderInstrumentCatalogBootstrapService(
        { synchronize } as never,
        {} as never,
      );

    await expect(
      service.bootstrap({
        providerId: "   ",
        resolve: jest.fn(),
      }),
    ).rejects.toThrow(
      "cTrader catalog bootstrap requires a providerId",
    );

    expect(synchronize).not.toHaveBeenCalled();
  });

  it("propagates catalog synchronization failures", async () => {
    const error = new Error("Security List unavailable");

    const synchronize = jest.fn().mockRejectedValue(error);

    const service =
      new CTraderInstrumentCatalogBootstrapService(
        { synchronize } as never,
        {} as never,
      );

    await expect(
      service.bootstrap({
        providerId: "ctrader-provider-id",
        resolve: jest.fn(),
      }),
    ).rejects.toThrow("Security List unavailable");
  });
});
