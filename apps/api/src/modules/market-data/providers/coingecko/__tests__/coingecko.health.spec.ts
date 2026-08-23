import { CoinGeckoHealthProvider } from "../coingecko.health";
import { CoinGeckoErrorMapper } from "../coingecko.error-mapper";
import type { CoinGeckoClient } from "../coingecko.client";

function buildClient(overrides: Partial<CoinGeckoClient> = {}): CoinGeckoClient {
  return { ping: jest.fn().mockResolvedValue(undefined), ...overrides } as unknown as CoinGeckoClient;
}

describe("CoinGeckoHealthProvider", () => {
  let errorMapper: CoinGeckoErrorMapper;

  beforeEach(() => {
    errorMapper = new CoinGeckoErrorMapper();
  });

  it("reports healthy with latency and a last-successful-request message on a successful /ping", async () => {
    const client = buildClient();
    const health = new CoinGeckoHealthProvider(client, errorMapper);

    const snapshot = await health.checkHealth();

    expect(snapshot.status).toBe("healthy");
    expect(snapshot.latencyMs).toBeGreaterThanOrEqual(0);
    expect(snapshot.message).toContain("consecutiveFailureCount=0");
    expect(snapshot.message).not.toContain("lastSuccessfulRequestAt=never");
  });

  it("reports down when the ping fails with an outage-classified error, and never throws", async () => {
    const client = buildClient({ ping: jest.fn().mockRejectedValue({ httpStatus: 500 }) });
    const health = new CoinGeckoHealthProvider(client, errorMapper);

    const snapshot = await health.checkHealth();

    expect(snapshot.status).toBe("down");
  });

  it("reports degraded when the ping itself is rate-limited", async () => {
    const client = buildClient({ ping: jest.fn().mockRejectedValue({ httpStatus: 429 }) });
    const health = new CoinGeckoHealthProvider(client, errorMapper);

    expect((await health.checkHealth()).status).toBe("degraded");
  });

  it("tracks and resets consecutive failure count", async () => {
    const client = buildClient({ ping: jest.fn().mockRejectedValue({ httpStatus: 500 }) });
    const health = new CoinGeckoHealthProvider(client, errorMapper);

    expect((await health.checkHealth()).message).toContain("consecutiveFailureCount=1");
    expect((await health.checkHealth()).message).toContain("consecutiveFailureCount=2");

    (client.ping as jest.Mock).mockResolvedValueOnce(undefined);
    const recovered = await health.checkHealth();
    expect(recovered.status).toBe("healthy");
    expect(recovered.message).toContain("consecutiveFailureCount=0");
  });
});
