import { TwelveDataHealthProvider } from "../twelve-data.health";
import { TwelveDataErrorMapper } from "../twelve-data.error-mapper";
import type { TwelveDataClient } from "../twelve-data.client";

function buildClient(overrides: Partial<TwelveDataClient> = {}): TwelveDataClient {
  return { ping: jest.fn().mockResolvedValue(undefined), ...overrides } as unknown as TwelveDataClient;
}

describe("TwelveDataHealthProvider", () => {
  let errorMapper: TwelveDataErrorMapper;

  beforeEach(() => {
    errorMapper = new TwelveDataErrorMapper();
  });

  it("reports healthy with a measured latency and a last-successful-request message on a successful ping", async () => {
    const client = buildClient();
    const health = new TwelveDataHealthProvider(client, errorMapper);

    const snapshot = await health.checkHealth();

    expect(snapshot.status).toBe("healthy");
    expect(snapshot.latencyMs).toBeGreaterThanOrEqual(0);
    expect(snapshot.lastCheckedAt).toBeInstanceOf(Date);
    expect(snapshot.message).toContain("consecutiveFailureCount=0");
    expect(snapshot.message).not.toContain("lastSuccessfulRequestAt=never");
  });

  it("reports down (not healthy, and never throws) when the provider is outage-classified", async () => {
    const client = buildClient({ ping: jest.fn().mockRejectedValue({ httpStatus: 500 }) });
    const health = new TwelveDataHealthProvider(client, errorMapper);

    const snapshot = await health.checkHealth();

    expect(snapshot.status).toBe("down");
  });

  it("reports degraded when the ping itself is rate-limited", async () => {
    const client = buildClient({ ping: jest.fn().mockRejectedValue({ httpStatus: 429 }) });
    const health = new TwelveDataHealthProvider(client, errorMapper);

    const snapshot = await health.checkHealth();

    expect(snapshot.status).toBe("degraded");
  });

  it("increments failure count across consecutive failures and resets it on the next success", async () => {
    const client = buildClient({ ping: jest.fn().mockRejectedValue({ httpStatus: 500 }) });
    const health = new TwelveDataHealthProvider(client, errorMapper);

    const first = await health.checkHealth();
    expect(first.message).toContain("consecutiveFailureCount=1");
    const second = await health.checkHealth();
    expect(second.message).toContain("consecutiveFailureCount=2");

    (client.ping as jest.Mock).mockResolvedValueOnce(undefined);
    const third = await health.checkHealth();
    expect(third.status).toBe("healthy");
    expect(third.message).toContain("consecutiveFailureCount=0");
  });
});
