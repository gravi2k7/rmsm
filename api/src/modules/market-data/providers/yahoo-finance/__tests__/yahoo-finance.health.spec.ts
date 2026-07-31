import { YahooFinanceHealthProvider } from "../yahoo-finance.health";
import { YahooFinanceErrorMapper } from "../yahoo-finance.error-mapper";
import type { YahooFinanceClient } from "../yahoo-finance.client";

function buildClient(overrides: Partial<YahooFinanceClient> = {}): YahooFinanceClient {
  return { ping: jest.fn().mockResolvedValue(undefined), ...overrides } as unknown as YahooFinanceClient;
}

describe("YahooFinanceHealthProvider", () => {
  let errorMapper: YahooFinanceErrorMapper;

  beforeEach(() => {
    errorMapper = new YahooFinanceErrorMapper();
  });

  it("reports healthy with latency and a last-successful-request message on a successful ping", async () => {
    const client = buildClient();
    const health = new YahooFinanceHealthProvider(client, errorMapper);

    const snapshot = await health.checkHealth();

    expect(snapshot.status).toBe("healthy");
    expect(snapshot.latencyMs).toBeGreaterThanOrEqual(0);
    expect(snapshot.message).toContain("consecutiveFailureCount=0");
    expect(snapshot.message).not.toContain("lastSuccessfulRequestAt=never");
  });

  it("reports down when the ping fails with a provider_outage-classified error, and never throws", async () => {
    const client = buildClient({ ping: jest.fn().mockRejectedValue({ isNetworkError: true }) });
    const health = new YahooFinanceHealthProvider(client, errorMapper);

    expect((await health.checkHealth()).status).toBe("down");
  });

  it("reports down when the crumb/cookie session negotiation fails (isProviderUnavailable)", async () => {
    const client = buildClient({ ping: jest.fn().mockRejectedValue({ isProviderUnavailable: true }) });
    const health = new YahooFinanceHealthProvider(client, errorMapper);

    expect((await health.checkHealth()).status).toBe("down");
  });

  it("reports degraded when the ping is rate-limited", async () => {
    const client = buildClient({ ping: jest.fn().mockRejectedValue({ httpStatus: 429 }) });
    const health = new YahooFinanceHealthProvider(client, errorMapper);

    expect((await health.checkHealth()).status).toBe("degraded");
  });

  it("tracks and resets consecutive failure count", async () => {
    const client = buildClient({ ping: jest.fn().mockRejectedValue({ isNetworkError: true }) });
    const health = new YahooFinanceHealthProvider(client, errorMapper);

    expect((await health.checkHealth()).message).toContain("consecutiveFailureCount=1");
    expect((await health.checkHealth()).message).toContain("consecutiveFailureCount=2");

    (client.ping as jest.Mock).mockResolvedValueOnce(undefined);
    const recovered = await health.checkHealth();
    expect(recovered.status).toBe("healthy");
    expect(recovered.message).toContain("consecutiveFailureCount=0");
  });
});
