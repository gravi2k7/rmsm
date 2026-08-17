import { MarketDataSource } from "@rmsm/database";
import { QuoteSynchronizationService } from "../quote-synchronization.service";

describe("QuoteSynchronizationService", () => {
  const instrumentRepository = {
    findById: jest.fn(),
  };

  const instrumentAliasRepository = {
    findByInstrument: jest.fn(),
  };

  const providerConfigRepository = {
    listActiveByPriority: jest.fn(),
  };

  const quoteRepository = {
    create: jest.fn(),
  };

  const orchestration = {
    executeWithRetry: jest.fn(),
  };

  let service: QuoteSynchronizationService;

  beforeEach(() => {
    jest.clearAllMocks();

    service = new QuoteSynchronizationService(
      instrumentRepository as never,
      instrumentAliasRepository as never,
      providerConfigRepository as never,
      quoteRepository as never,
      orchestration as never,
    );
  });

  it("fetches a live quote through provider orchestration and persists it", async () => {
    const eventTime = new Date("2026-08-17T05:00:00.000Z");
    const sourceTimestamp = new Date("2026-08-17T05:00:00.000Z");

    instrumentRepository.findById.mockResolvedValue({
      id: "instr-1",
      symbol: "EURUSD",
    });

    providerConfigRepository.listActiveByPriority.mockResolvedValue([
      {
        id: "provider-1",
        type: "TWELVE_DATA",
        name: "Twelve Data",
        isActive: true,
        priority: 10,
      },
    ]);

    instrumentAliasRepository.findByInstrument.mockResolvedValue([
      {
        instrumentId: "instr-1",
        providerId: "provider-1",
        providerSymbol: "EUR/USD",
      },
    ]);

    orchestration.executeWithRetry.mockImplementation(
      async (
        providerType: string,
        operation: (provider: unknown) => Promise<unknown>,
      ) => {
        expect(providerType).toBe("TWELVE_DATA");

        return operation({
          quoteClient: {
            fetchLatestQuote: jest.fn().mockResolvedValue({
              providerSymbol: "EUR/USD",
              bidPrice: "1.10000",
              askPrice: "1.10020",
              lastPrice: "1.10010",
              bidSize: "100",
              askSize: "120",
              eventTime,
              sourceTimestamp,
            }),
          },
        });
      },
    );

    quoteRepository.create.mockResolvedValue({
      id: "quote-1",
      instrumentId: "instr-1",
      eventTime,
    });

    const result = await service.synchronizeInstrument("instr-1");

    expect(quoteRepository.create).toHaveBeenCalledWith({
      instrumentId: "instr-1",
      bidPrice: "1.10000",
      askPrice: "1.10020",
      lastPrice: "1.10010",
      bidSize: "100",
      askSize: "120",
      eventTime,
      providerId: "provider-1",
      source: MarketDataSource.LIVE,
      sourceTimestamp,
    });

    expect(result).toEqual({
      instrumentId: "instr-1",
      providerId: "provider-1",
      providerType: "TWELVE_DATA",
      providerSymbol: "EUR/USD",
      quoteId: "quote-1",
      eventTime,
    });
  });

  it("does not persist a quote when the instrument has no provider alias", async () => {
    instrumentRepository.findById.mockResolvedValue({
      id: "instr-1",
      symbol: "EURUSD",
    });

    providerConfigRepository.listActiveByPriority.mockResolvedValue([
      {
        id: "provider-1",
        type: "TWELVE_DATA",
        name: "Twelve Data",
        isActive: true,
        priority: 10,
      },
    ]);

    instrumentAliasRepository.findByInstrument.mockResolvedValue([]);

    await expect(
      service.synchronizeInstrument("instr-1"),
    ).rejects.toThrow(/No active provider alias exists/);

    expect(orchestration.executeWithRetry).not.toHaveBeenCalled();
    expect(quoteRepository.create).not.toHaveBeenCalled();
  });

  it("rejects a provider response for a different symbol", async () => {
    instrumentRepository.findById.mockResolvedValue({
      id: "instr-1",
      symbol: "EURUSD",
    });

    providerConfigRepository.listActiveByPriority.mockResolvedValue([
      {
        id: "provider-1",
        type: "TWELVE_DATA",
        name: "Twelve Data",
        isActive: true,
        priority: 10,
      },
    ]);

    instrumentAliasRepository.findByInstrument.mockResolvedValue([
      {
        instrumentId: "instr-1",
        providerId: "provider-1",
        providerSymbol: "EUR/USD",
      },
    ]);

    orchestration.executeWithRetry.mockImplementation(
      async (
        _providerType: string,
        operation: (provider: unknown) => Promise<unknown>,
      ) =>
        operation({
          quoteClient: {
            fetchLatestQuote: jest.fn().mockResolvedValue({
              providerSymbol: "GBP/USD",
              bidPrice: "1.30000",
              askPrice: "1.30020",
              lastPrice: "1.30010",
              eventTime: new Date("2026-08-17T05:00:00.000Z"),
            }),
          },
        }),
    );

    await expect(
      service.synchronizeInstrument("instr-1"),
    ).rejects.toThrow(/returned symbol "GBP\/USD"/);

    expect(quoteRepository.create).not.toHaveBeenCalled();
  });
});
