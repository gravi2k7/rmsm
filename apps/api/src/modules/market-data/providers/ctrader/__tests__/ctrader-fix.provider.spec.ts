import { CTraderFixProvider } from "../ctrader-fix.provider";
import { CTraderFixErrorMapper } from "../ctrader-fix.error-mapper";
import { CTraderFixHealthProvider } from "../ctrader-fix.health";
import { CTraderFixRateLimiter } from "../ctrader-fix.rate-limit";

describe("CTraderFixProvider", () => {
  function createClient(
    quote?: {
      providerSymbol: string;
      bidPrice?: string;
      askPrice?: string;
      eventTime: Date;
    },
  ) {
    return {
      getLatestQuote: jest.fn().mockReturnValue(quote),
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      subscribe: jest.fn().mockResolvedValue(undefined),
      state: {
        connected: true,
        loggedOn: true,
        lastMessageAt: new Date(),
        lastQuoteAt: new Date(),
        reconnectAttempts: 0,
      },
    } as any;
  }

  function createProvider(quote?: Parameters<typeof createClient>[0]) {
    const client = createClient(quote);

    const rateLimiter = new CTraderFixRateLimiter();
    const errorMapper = new CTraderFixErrorMapper();
    const healthProvider = new CTraderFixHealthProvider(client);

    return {
      client,
      provider: new CTraderFixProvider(
        client,
        rateLimiter,
        errorMapper,
        healthProvider,
      ),
    };
  }

  it("exposes cTrader as the CTRADER market-data provider", () => {
    const { provider } = createProvider();

    expect(provider.type).toBe("CTRADER");
    expect(provider.metadata.name).toBe(
      "cTrader FIX Price Connection",
    );
    expect(provider.metadata.supportsQuotes).toBe(true);
    expect(provider.metadata.supportsStreaming).toBe(true);
    expect(provider.metadata.supportsHistorical).toBe(false);
    expect(provider.metadata.supportsTicks).toBe(false);
  });

  it("returns the latest normalized quote", async () => {
    const quote = {
      providerSymbol: "1",
      bidPrice: "1.16936",
      askPrice: "1.16946",
      eventTime: new Date(),
    };

    const { client, provider } = createProvider(quote);

    const result = await provider.quoteClient.fetchLatestQuote("1");

    expect(client.getLatestQuote).toHaveBeenCalledWith("1");
    expect(result).toEqual(quote);
  });

  it("fetches multiple latest quotes", async () => {
    const first = {
      providerSymbol: "1",
      bidPrice: "1.16936",
      askPrice: "1.16946",
      eventTime: new Date(),
    };

    const second = {
      providerSymbol: "2",
      bidPrice: "100",
      askPrice: "101",
      eventTime: new Date(),
    };

    const { client, provider } = createProvider(first);

    client.getLatestQuote
      .mockReturnValueOnce(first)
      .mockReturnValueOnce(second);

    const result = await provider.quoteClient.fetchLatestQuotes([
      "1",
      "2",
    ]);

    expect(result).toEqual([first, second]);
  });

  it("throws when a quote is not yet available", async () => {
    const { provider } = createProvider();

    await expect(
      provider.quoteClient.fetchLatestQuote("1"),
    ).rejects.toThrow(
      "cTrader FIX quote is not available for provider symbol 1",
    );
  });

  it("delegates FIX lifecycle operations to the client", async () => {
    const { client, provider } = createProvider();

    await provider.connect();
    await provider.subscribe(
      "1",
      "RMSM-EURUSD-TEST",
      "12345",
    );
    await provider.disconnect();

    expect(client.connect).toHaveBeenCalledTimes(1);
    expect(client.subscribe).toHaveBeenCalledWith(
      "1",
      "RMSM-EURUSD-TEST",
      "12345",
    );
    expect(client.disconnect).toHaveBeenCalledTimes(1);
  });
});
