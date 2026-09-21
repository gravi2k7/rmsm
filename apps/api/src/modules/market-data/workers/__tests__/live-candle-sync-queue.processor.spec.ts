import { MarketDataProviderType, InstrumentStatus } from "@rmsm/database";
import { LiveCandleSyncQueueProcessor } from "../live-candle-sync-queue.processor";

describe("LiveCandleSyncQueueProcessor", () => {
  function build() {
    const instrumentRepository = {
      search: jest.fn(),
    };

    const instrumentAliasRepository = {
      findByInstrument: jest.fn(),
    };

    const providerConfigRepository = {
      listActiveByPriority: jest.fn(),
    };

    const liveCandleSynchronizationService = {
      synchronizeInstrument: jest.fn(),
    };

    const processor = new LiveCandleSyncQueueProcessor(
      instrumentRepository as never,
      instrumentAliasRepository as never,
      providerConfigRepository as never,
      liveCandleSynchronizationService as never,
    );

    return {
      processor,
      instrumentRepository,
      instrumentAliasRepository,
      providerConfigRepository,
      liveCandleSynchronizationService,
    };
  }

  it("skips cTrader instruments because FIX live candle builder owns them", async () => {
    const {
      processor,
      instrumentRepository,
      instrumentAliasRepository,
      providerConfigRepository,
      liveCandleSynchronizationService,
    } = build();

    instrumentRepository.search.mockResolvedValue([
      { id: "ctrader-1", symbol: "FRA40", status: InstrumentStatus.ACTIVE },
      { id: "other-1", symbol: "EURUSD", status: InstrumentStatus.ACTIVE },
    ]);

    providerConfigRepository.listActiveByPriority.mockResolvedValue([
      {
        id: "ctrader-provider",
        type: MarketDataProviderType.CTRADER,
      },
      {
        id: "twelve-provider",
        type: "TWELVE_DATA",
      },
    ]);

    instrumentAliasRepository.findByInstrument
      .mockResolvedValueOnce([
        {
          instrumentId: "ctrader-1",
          providerId: "ctrader-provider",
          providerSymbol: "FRA40",
        },
      ])
      .mockResolvedValueOnce([
        {
          instrumentId: "other-1",
          providerId: "twelve-provider",
          providerSymbol: "EUR/USD",
        },
      ]);

    liveCandleSynchronizationService.synchronizeInstrument.mockResolvedValue({
      persisted: 1,
    });

    await processor.process({
      name: "sync-live-candles",
    } as never);

    expect(
      liveCandleSynchronizationService.synchronizeInstrument,
    ).toHaveBeenCalledTimes(1);

    expect(
      liveCandleSynchronizationService.synchronizeInstrument,
    ).toHaveBeenCalledWith("other-1");
  });

  it("does not skip instruments that only have non-cTrader aliases", async () => {
    const {
      processor,
      instrumentRepository,
      instrumentAliasRepository,
      providerConfigRepository,
      liveCandleSynchronizationService,
    } = build();

    instrumentRepository.search.mockResolvedValue([
      { id: "instrument-1", symbol: "EURUSD" },
    ]);

    providerConfigRepository.listActiveByPriority.mockResolvedValue([
      {
        id: "twelve-provider",
        type: "TWELVE_DATA",
      },
      {
        id: "ctrader-provider",
        type: MarketDataProviderType.CTRADER,
      },
    ]);

    instrumentAliasRepository.findByInstrument.mockResolvedValue([
      {
        instrumentId: "instrument-1",
        providerId: "twelve-provider",
        providerSymbol: "EUR/USD",
      },
    ]);

    liveCandleSynchronizationService.synchronizeInstrument.mockResolvedValue({
      persisted: 1,
    });

    await processor.process({
      name: "sync-live-candles",
    } as never);

    expect(
      liveCandleSynchronizationService.synchronizeInstrument,
    ).toHaveBeenCalledWith("instrument-1");
  });

  it("ignores unexpected jobs without querying instruments", async () => {
    const {
      processor,
      instrumentRepository,
      providerConfigRepository,
    } = build();

    await processor.process({
      name: "unexpected-job",
    } as never);

    expect(instrumentRepository.search).not.toHaveBeenCalled();
    expect(providerConfigRepository.listActiveByPriority).not.toHaveBeenCalled();
  });
});
