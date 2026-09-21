import { CTraderLiveQuoteIngestionService } from "../ctrader-live-quote-ingestion.service";

describe("CTraderLiveQuoteIngestionService", () => {
  const listeners = new Map<string, (...args: any[]) => void>();

  const client: {
    on: jest.Mock;
    subscribe: jest.Mock;
  } = {
    on: jest.fn((event: string, listener: (...args: any[]) => void) => {
      listeners.set(event, listener);
      return client;
    }),
    subscribe: jest.fn().mockResolvedValue(undefined),
  };

  const providerConfigRepository = {
    findByType: jest.fn(),
  };

  const aliases = {
    findByProvider: jest.fn(),
  };

  const streamPublisher = {
    publishQuote: jest.fn(),
    publishDepth: jest.fn(),
  };

  let service: CTraderLiveQuoteIngestionService;

  beforeEach(() => {
    jest.clearAllMocks();
    listeners.clear();

    providerConfigRepository.findByType.mockResolvedValue({
      id: "provider-1",
      type: "CTRADER",
      name: "cTrader",
      isActive: true,
    });

    aliases.findByProvider.mockResolvedValue([
      {
        instrumentId: "instrument-1",
        providerId: "provider-1",
        providerSymbol: "XAUUSD",
        providerInstrumentId: "41",
      },
    ]);

    service = new CTraderLiveQuoteIngestionService(
      client as never,
      providerConfigRepository as never,
      aliases as never,
      streamPublisher as never,
    );

    service.onModuleInit();
  });

  it("publishes every live quote without writing quotes to PostgreSQL", async () => {
    const loggedOn = listeners.get("loggedOn");

    expect(loggedOn).toBeDefined();

    loggedOn!();

    await new Promise<void>((resolve) => setImmediate(resolve));

    const quoteListener = listeners.get("quote");

    expect(quoteListener).toBeDefined();

    const eventTime = new Date("2026-09-18T05:00:10.000Z");

    quoteListener!({
      providerSymbol: "XAUUSD",
      bidPrice: "3650.10",
      askPrice: "3650.30",
      lastPrice: "3650.20",
      bidSize: "10",
      askSize: "12",
      eventTime,
    });

    expect(streamPublisher.publishQuote).toHaveBeenCalledTimes(1);

    expect(streamPublisher.publishQuote).toHaveBeenCalledWith({
      instrumentId: "instrument-1",
      providerSymbol: "XAUUSD",
      bidPrice: "3650.10",
      askPrice: "3650.30",
      lastPrice: "3650.20",
      bidSize: "10",
      askSize: "12",
      eventTime,
      sourceTimestamp: undefined,
    });

    /*
     * Regression guard:
     *
     * CTraderLiveQuoteIngestionService intentionally has no quote repository.
     * Therefore this realtime path cannot create market_quotes rows.
     */
    expect(
      Object.keys(service).some((key) =>
        key.toLowerCase().includes("quote"),
      ),
    ).toBe(false);
  });

  it("publishes live depth using the resolved instrument alias", async () => {
    const loggedOn = listeners.get("loggedOn");

    expect(loggedOn).toBeDefined();

    loggedOn!();

    await new Promise<void>((resolve) => setImmediate(resolve));

    const depthListener = listeners.get("depth");

    expect(depthListener).toBeDefined();

    const eventTime = new Date("2026-09-18T05:00:10.000Z");

    depthListener!({
      providerSymbol: "XAUUSD",
      bids: [
        { price: "3650.10", size: "10" },
        { price: "3650.00", size: "20" },
      ],
      asks: [
        { price: "3650.30", size: "12" },
        { price: "3650.40", size: "18" },
      ],
      eventTime,
    });

    expect(streamPublisher.publishDepth).toHaveBeenCalledTimes(1);

    expect(streamPublisher.publishDepth).toHaveBeenCalledWith({
      instrumentId: "instrument-1",
      providerSymbol: "XAUUSD",
      bids: [
        { price: "3650.10", size: "10" },
        { price: "3650.00", size: "20" },
      ],
      asks: [
        { price: "3650.30", size: "12" },
        { price: "3650.40", size: "18" },
      ],
      eventTime,
    });
  });

  it("loads provider and aliases once on FIX logon", async () => {
    listeners.get("loggedOn")!();

    await new Promise<void>((resolve) => setImmediate(resolve));

    expect(providerConfigRepository.findByType).toHaveBeenCalledTimes(1);
    expect(providerConfigRepository.findByType).toHaveBeenCalledWith(
      "CTRADER",
    );

    expect(aliases.findByProvider).toHaveBeenCalledTimes(1);
    expect(aliases.findByProvider).toHaveBeenCalledWith("provider-1");

    const quoteListener = listeners.get("quote")!;

    quoteListener!({
      providerSymbol: "XAUUSD",
      bidPrice: "3650.10",
      askPrice: "3650.30",
      eventTime: new Date("2026-09-18T05:00:10.000Z"),
    });

    quoteListener!({
      providerSymbol: "XAUUSD",
      bidPrice: "3650.20",
      askPrice: "3650.40",
      eventTime: new Date("2026-09-18T05:00:10.100Z"),
    });

    expect(providerConfigRepository.findByType).toHaveBeenCalledTimes(1);
    expect(aliases.findByProvider).toHaveBeenCalledTimes(1);
    expect(streamPublisher.publishQuote).toHaveBeenCalledTimes(2);
  });

  it("ignores quotes for unknown provider symbols", async () => {
    listeners.get("loggedOn")!();

    await new Promise<void>((resolve) => setImmediate(resolve));

    listeners.get("quote")!({
      providerSymbol: "UNKNOWN",
      bidPrice: "100",
      askPrice: "101",
      eventTime: new Date("2026-09-18T05:00:10.000Z"),
    });

    expect(streamPublisher.publishQuote).not.toHaveBeenCalled();
  });

  it("does not subscribe aliases without providerInstrumentId", async () => {
    aliases.findByProvider.mockResolvedValueOnce([
      {
        instrumentId: "instrument-1",
        providerId: "provider-1",
        providerSymbol: "XAUUSD",
        providerInstrumentId: undefined,
      },
    ]);

    listeners.get("loggedOn")!();

    await new Promise<void>((resolve) => setImmediate(resolve));

    expect(client.subscribe).not.toHaveBeenCalled();
  });
});
