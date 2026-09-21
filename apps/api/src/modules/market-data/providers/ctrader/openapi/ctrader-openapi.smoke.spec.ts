import { CTraderOpenApiClient } from "./ctrader-openapi.client";

describe("cTrader Open API historical smoke test", () => {
  jest.setTimeout(30_000);

  it("fetches XAGUSD M1 trendbars", async () => {
    const client = new CTraderOpenApiClient({
      host: process.env.CTRADER_OPENAPI_HOST!,
      port: Number(process.env.CTRADER_OPENAPI_PORT),
      clientId: process.env.CTRADER_OPENAPI_CLIENT_ID!,
      clientSecret: process.env.CTRADER_OPENAPI_CLIENT_SECRET!,
      accessToken: process.env.CTRADER_OPENAPI_ACCESS_TOKEN!,
      accountId: Number(process.env.CTRADER_OPENAPI_ACCOUNT_ID),
      connectTimeoutMs: Number(process.env.CTRADER_OPENAPI_CONNECT_TIMEOUT),
      requestTimeoutMs: Number(process.env.CTRADER_OPENAPI_REQUEST_TIMEOUT),
    });

    try {
      const response = await client.requestTrendbars({
        accountId: Number(process.env.CTRADER_OPENAPI_ACCOUNT_ID),
        symbolId: 42,
        period: 1,
        fromTimestamp: Date.parse("2026-09-03T09:00:00.000Z"),
        toTimestamp: Date.parse("2026-09-03T10:00:00.000Z"),
        count: 100,
      });

      const result = response as {
        trendbar?: Array<{
          volume: string | number;
          low?: string | number;
          deltaOpen?: string | number;
          deltaClose?: string | number;
          deltaHigh?: string | number;
          utcTimestampInMinutes?: string | number;
        }>;
        hasMore?: boolean;
      };

      console.log(
        "CTRADER_HISTORICAL_SMOKE",
        JSON.stringify({
          count: result.trendbar?.length ?? 0,
          hasMore: result.hasMore ?? false,
          first: result.trendbar?.[0] ?? null,
          last: result.trendbar?.[result.trendbar.length - 1] ?? null,
        }),
      );

      expect(result.trendbar?.length ?? 0).toBeGreaterThan(0);
    } finally {
      await client.disconnect();
    }
  });
});
