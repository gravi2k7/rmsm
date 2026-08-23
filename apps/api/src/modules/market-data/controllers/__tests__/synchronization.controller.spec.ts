import { SynchronizationController } from "../synchronization.controller";
import type { MarketDataAdminService } from "../../services/market-data-admin.service";
import type { HistoricalImportService } from "../../services/historical-import.service";
import type { ReferenceDataSynchronizationService } from "../../services/reference-data-synchronization.service";
import type { QuoteSynchronizationService } from "../../services/quote-synchronization.service";
import type { CTraderInstrumentCatalogBootstrapService } from "../../providers/ctrader/ctrader-fix.catalog.bootstrap";
import type { CTraderFixInstrumentResolver } from "../../providers/ctrader/ctrader-fix.instrument-resolver";

describe("SynchronizationController", () => {
  function buildController(
    overrides: Partial<{
      adminService: MarketDataAdminService;
      historicalImportService: HistoricalImportService;
      referenceDataSynchronizationService: ReferenceDataSynchronizationService;
      quoteSynchronizationService: QuoteSynchronizationService;
      cTraderCatalogBootstrapService: CTraderInstrumentCatalogBootstrapService;
      cTraderInstrumentResolver: CTraderFixInstrumentResolver;
    }> = {},
  ) {
    const adminService = {
      getSynchronizationHealth: jest.fn(),
      getMetrics: jest.fn(),
      listImportJobsByStatus: jest.fn(),
      getImportJob: jest.fn(),
      ...overrides.adminService,
    } as unknown as MarketDataAdminService;

    const historicalImportService = {
      importHistoricalCandles: jest.fn(),
      ...overrides.historicalImportService,
    } as unknown as HistoricalImportService;

    const referenceDataSynchronizationService = {
      synchronizeTwelveData: jest.fn(),
      ...overrides.referenceDataSynchronizationService,
    } as unknown as ReferenceDataSynchronizationService;

    const quoteSynchronizationService = {
      synchronizeInstrument: jest.fn(),
      ...overrides.quoteSynchronizationService,
    } as unknown as QuoteSynchronizationService;

    const cTraderCatalogBootstrapService = {
      bootstrap: jest.fn(),
      ...overrides.cTraderCatalogBootstrapService,
    } as unknown as CTraderInstrumentCatalogBootstrapService;

    const cTraderInstrumentResolver = {
      resolve: jest.fn(),
      ...overrides.cTraderInstrumentResolver,
    } as unknown as CTraderFixInstrumentResolver;

    return {
      controller: new SynchronizationController(
        adminService,
        historicalImportService,
        referenceDataSynchronizationService,
        quoteSynchronizationService,
        cTraderCatalogBootstrapService,
        cTraderInstrumentResolver,
      ),
      adminService,
      historicalImportService,
      referenceDataSynchronizationService,
      quoteSynchronizationService,
      cTraderCatalogBootstrapService,
      cTraderInstrumentResolver,
    };
  }

  it("synchronizes the cTrader catalog through the bootstrap service", async () => {
    const result = {
      providerId: "ctrader-provider-id",
      processed: 3,
      synchronized: 2,
      skipped: 1,
      aliases: 2,
    };

    const resolve = jest.fn().mockResolvedValue({
      instrument: {
        exchangeId: null,
        symbol: "EURUSD",
        name: "EURUSD",
        assetClass: "FOREX",
        currency: "USD",
      },
    });

    const bootstrap = jest.fn().mockImplementation(async (options) => {
      await options.resolve({
        providerInstrumentId: "1",
        providerSymbol: "EURUSD",
        name: "EURUSD",
        digits: 5,
      });

      return result;
    });

    const { controller, cTraderCatalogBootstrapService, cTraderInstrumentResolver } =
      buildController({
        cTraderCatalogBootstrapService: {
          bootstrap,
        } as unknown as CTraderInstrumentCatalogBootstrapService,
        cTraderInstrumentResolver: {
          resolve,
        } as unknown as CTraderFixInstrumentResolver,
      });

    await expect(
      controller.synchronizeCTraderCatalog({
        providerId: "ctrader-provider-id",
        timeoutMs: 30000,
      }),
    ).resolves.toEqual(result);

    expect(bootstrap).toHaveBeenCalledTimes(1);

    expect(bootstrap).toHaveBeenCalledWith(
      expect.objectContaining({
        providerId: "ctrader-provider-id",
        timeoutMs: 30000,
        resolve: expect.any(Function),
      }),
    );

    expect(resolve).toHaveBeenCalledWith(
      "ctrader-provider-id",
      expect.objectContaining({
        providerInstrumentId: "1",
        providerSymbol: "EURUSD",
      }),
    );

    expect(cTraderCatalogBootstrapService.bootstrap).toHaveBeenCalledTimes(1);
    expect(cTraderInstrumentResolver.resolve).toHaveBeenCalledTimes(1);
  });

  it("propagates cTrader catalog synchronization failures", async () => {
    const error = new Error("cTrader catalog unavailable");

    const { controller } = buildController({
      cTraderCatalogBootstrapService: {
        bootstrap: jest.fn().mockRejectedValue(error),
      } as unknown as CTraderInstrumentCatalogBootstrapService,
    });

    await expect(
      controller.synchronizeCTraderCatalog({
        providerId: "ctrader-provider-id",
      }),
    ).rejects.toThrow("cTrader catalog unavailable");
  });

  it("passes the optional cTrader catalog timeout through unchanged", async () => {
    const bootstrap = jest.fn().mockResolvedValue({
      providerId: "ctrader-provider-id",
      processed: 0,
      synchronized: 0,
      skipped: 0,
      aliases: 0,
    });

    const { controller } = buildController({
      cTraderCatalogBootstrapService: {
        bootstrap,
      } as unknown as CTraderInstrumentCatalogBootstrapService,
    });

    await controller.synchronizeCTraderCatalog({
      providerId: "ctrader-provider-id",
      timeoutMs: 45000,
    });

    expect(bootstrap).toHaveBeenCalledWith(
      expect.objectContaining({
        providerId: "ctrader-provider-id",
        timeoutMs: 45000,
        resolve: expect.any(Function),
      }),
    );
  });

  it("synchronizes the latest live quote for the requested instrument", async () => {
    const result = {
      instrumentId: "instrument-1",
      providerId: "provider-1",
      providerType: "TWELVE_DATA",
      providerSymbol: "EUR/USD",
      quoteId: "quote-1",
      eventTime: new Date("2026-08-17T10:30:00.000Z"),
    };

    const { controller, quoteSynchronizationService } = buildController({
      quoteSynchronizationService: {
        synchronizeInstrument: jest.fn().mockResolvedValue(result),
      } as unknown as QuoteSynchronizationService,
    });

    await expect(
      controller.synchronizeInstrumentQuote("instrument-1"),
    ).resolves.toEqual(result);

    expect(
      quoteSynchronizationService.synchronizeInstrument,
    ).toHaveBeenCalledTimes(1);

    expect(
      quoteSynchronizationService.synchronizeInstrument,
    ).toHaveBeenCalledWith("instrument-1");
  });

  it("returns the service error when quote synchronization fails", async () => {
    const error = new Error("Provider unavailable");

    const { controller } = buildController({
      quoteSynchronizationService: {
        synchronizeInstrument: jest.fn().mockRejectedValue(error),
      } as unknown as QuoteSynchronizationService,
    });

    await expect(
      controller.synchronizeInstrumentQuote("instrument-1"),
    ).rejects.toThrow("Provider unavailable");
  });
});
