import { SynchronizationController } from "../synchronization.controller";
import type { MarketDataAdminService } from "../../services/market-data-admin.service";
import type { HistoricalImportService } from "../../services/historical-import.service";
import type { ReferenceDataSynchronizationService } from "../../services/reference-data-synchronization.service";
import type { QuoteSynchronizationService } from "../../services/quote-synchronization.service";

describe("SynchronizationController", () => {
  function buildController(
    overrides: Partial<{
      adminService: MarketDataAdminService;
      historicalImportService: HistoricalImportService;
      referenceDataSynchronizationService: ReferenceDataSynchronizationService;
      quoteSynchronizationService: QuoteSynchronizationService;
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

    return {
      controller: new SynchronizationController(
        adminService,
        historicalImportService,
        referenceDataSynchronizationService,
        quoteSynchronizationService,
      ),
      adminService,
      historicalImportService,
      referenceDataSynchronizationService,
      quoteSynchronizationService,
    };
  }

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
