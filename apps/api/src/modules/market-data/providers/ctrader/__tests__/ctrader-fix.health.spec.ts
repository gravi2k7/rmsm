import { CTraderFixHealthProvider } from "../ctrader-fix.health";
import type { CTraderFixClient } from "../ctrader-fix.client";

function createClient(
  state: Partial<CTraderFixClient["state"]>,
): CTraderFixClient {
  return {
    state: {
      connected: false,
      loggedOn: false,
      lastMessageAt: null,
      lastQuoteAt: null,
      reconnectAttempts: 0,
      ...state,
    },
  } as CTraderFixClient;
}

describe("CTraderFixHealthProvider", () => {
  it("reports healthy when FIX is connected and logged on", async () => {
    const client = createClient({
      connected: true,
      loggedOn: true,
      lastMessageAt: new Date(),
      lastQuoteAt: new Date(),
    });

    const health = new CTraderFixHealthProvider(client);

    const result = await health.checkHealth();

    expect(result.status).toBe("healthy");
    expect(result.latencyMs).toEqual(expect.any(Number));
  });

  it("reports degraded when connected but not logged on", async () => {
    const client = createClient({
      connected: true,
      loggedOn: false,
    });

    const health = new CTraderFixHealthProvider(client);

    const result = await health.checkHealth();

    expect(result.status).toBe("degraded");
  });

  it("reports down after an established session disconnects", async () => {
    const client = createClient({
      connected: false,
      loggedOn: false,
      lastMessageAt: new Date(),
      reconnectAttempts: 1,
    });

    const health = new CTraderFixHealthProvider(client);

    const result = await health.checkHealth();

    expect(result.status).toBe("down");
  });

  it("reports unknown before the first connection attempt", async () => {
    const client = createClient({});

    const health = new CTraderFixHealthProvider(client);

    const result = await health.checkHealth();

    expect(result.status).toBe("unknown");
  });
});
