import { CTraderFixMapper } from "../ctrader-fix.mapper";

describe("CTraderFixMapper", () => {
  it("maps both BID and ASK from a cTrader FIX snapshot", () => {
    const mapper = new CTraderFixMapper();

    const quote = mapper.toNormalizedQuote({
      providerSymbol: "1",
      eventTime: new Date("2026-08-21T06:05:11.161Z"),
      entries: [
        {
          type: "0",
          price: "1.16936",
        },
        {
          type: "1",
          price: "1.16946",
        },
      ],
    });

    expect(quote.bidPrice).toBe("1.16936");
    expect(quote.askPrice).toBe("1.16946");
  });

  it("maps BID and ASK sizes when supplied", () => {
    const mapper = new CTraderFixMapper();

    const quote = mapper.toNormalizedQuote({
      providerSymbol: "1",
      eventTime: new Date("2026-08-21T06:05:11.161Z"),
      entries: [
        {
          type: "0",
          price: "1.16936",
          size: "1000000",
        },
        {
          type: "1",
          price: "1.16946",
          size: "1000000",
        },
      ],
    });

    expect(quote.bidPrice).toBe("1.16936");
    expect(quote.askPrice).toBe("1.16946");
    expect(quote.bidSize).toBe("1000000");
    expect(quote.askSize).toBe("1000000");
  });

  it("allows a snapshot containing only one side", () => {
    const mapper = new CTraderFixMapper();

    const quote = mapper.toNormalizedQuote({
      providerSymbol: "1",
      eventTime: new Date("2026-08-21T06:05:11.161Z"),
      entries: [
        {
          type: "0",
          price: "1.16936",
        },
      ],
    });

    expect(quote.bidPrice).toBe("1.16936");
    expect(quote.askPrice).toBeUndefined();
  });
});
