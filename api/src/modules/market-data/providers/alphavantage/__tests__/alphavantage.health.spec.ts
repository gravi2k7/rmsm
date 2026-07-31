import { AlphaVantageHealthProvider } from "../alphavantage.health";
import { AlphaVantageErrorMapper } from "../alphavantage.error-mapper";
import type { AlphaVantageClient } from "../alphavantage.client";

function buildClient(overrides: Partial<AlphaVantageClient> = {}): AlphaVantageClient {
  return { ping: jest.fn().mockResolvedValue(undefined), ...overrides } as unknown as AlphaVantageClient;
}

describe("AlphaVantageHealthProvider", () => {
  let errorMapper: AlphaVantageErrorMapper;

  beforeEach(() => {
    errorMapper = new AlphaVantageErrorMapper();
  });

  it("reports healthy with latency and a last-successful-request message on a successful ping", async () => {
    const client = buildClient();
    const health = new AlphaVantageHealthProvider(client, errorMapper);

    const snapshot = await health.checkHealth();

    expect(snapshot.status).toBe("healthy");
    expect(snapshot.latencyMs).toBeGreaterThanOrEqual(0);
    expect(snapshot.message).toContain("consecutiveFailureCount=0");
    expect(snapshot.message).not.toContain("lastSuccessfulRequestAt=never");
  });

  it("reports down when the ping fails with a provider_outage-classified error, and never throws", async () => {
    const client = buildClient({ ping: jest.fn().mockRejectedValue({ isNetworkFailure: true }) });
    const health = new AlphaVantageHealthProvider(client, errorMapper);

    const snapshot = await health.checkHealth();

    expect(snapshot.status).toBe("down");
  });

  it("reports degraded when the ping itself is rate-limited (Note-flagged)", async () => {
    const client = buildClient({ ping: jest.fn().mockRejectedValue({ isNoteRateLimit: true }) });
    const health = new AlphaVantageHealthProvider(client, errorMapper);

    expect((await health.checkHealth()).status).toBe("degraded");
  });

  it("reports unknown (not down/degraded) when the ping fails with an authentication error", async () => {
    const client = buildClient({ ping: jest.fn().mockRejectedValue({ httpStatus: 401 }) });
    const health = new AlphaVantageHealthProvider(client, errorMapper);

    expect((await health.checkHealth()).status).toBe("unknown");
  });

  it("tracks and resets consecutive failure count", async () => {
    const client = buildClient({ ping: jest.fn().mockRejectedValue({ isNetworkFailure: true }) });
    const health = new AlphaVantageHealthProvider(client, errorMapper);

    expect((await health.checkHealth()).message).toContain("consecutiveFailureCount=1");
    expect((await health.checkHealth()).message).toContain("consecutiveFailureCount=2");

    (client.ping as jest.Mock).mockResolvedValueOnce(undefined);
    const recovered = await health.checkHealth();
    expect(recovered.status).toBe("healthy");
    expect(recovered.message).toContain("consecutiveFailureCount=0");
  });
});
