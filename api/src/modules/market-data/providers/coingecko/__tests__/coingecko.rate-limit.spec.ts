import { CoinGeckoRateLimiter } from "../coingecko.rate-limit";
import { COINGECKO_DEFAULT_REQUESTS_PER_MINUTE } from "../coingecko.constants";

describe("CoinGeckoRateLimiter", () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("defaults to CoinGecko's documented public-tier ceiling of 30 requests/minute", () => {
    const limiter = new CoinGeckoRateLimiter();
    expect(limiter.requestsPerMinute).toBe(COINGECKO_DEFAULT_REQUESTS_PER_MINUTE);
    expect(limiter.requestsPerMinute).toBe(30);
  });

  it("allows calls up to the configured limit with zero wait", async () => {
    const limiter = new CoinGeckoRateLimiter(3);
    for (let i = 0; i < 3; i++) {
      expect(await limiter.getWaitTimeMs()).toBe(0);
      limiter.recordCall();
    }
  });

  it("requires a wait once the limit is reached within the 60s window", async () => {
    const limiter = new CoinGeckoRateLimiter(2);
    limiter.recordCall();
    limiter.recordCall();

    const waitMs = await limiter.getWaitTimeMs();
    expect(waitMs).toBeGreaterThan(0);
    expect(waitMs).toBeLessThanOrEqual(60_000);
  });

  it("frees capacity once the oldest call falls outside the sliding window", async () => {
    const limiter = new CoinGeckoRateLimiter(1);
    limiter.recordCall();
    expect(await limiter.getWaitTimeMs()).toBeGreaterThan(0);

    jest.advanceTimersByTime(60_001);

    expect(await limiter.getWaitTimeMs()).toBe(0);
  });
});
