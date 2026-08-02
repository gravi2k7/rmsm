import { AlphaVantageRateLimiter } from "../alphavantage.rate-limit";
import { ALPHA_VANTAGE_DEFAULT_REQUESTS_PER_MINUTE, ALPHA_VANTAGE_DEFAULT_REQUESTS_PER_DAY } from "../alphavantage.constants";

describe("AlphaVantageRateLimiter", () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("defaults to Alpha Vantage's documented free-tier ceilings (5/min, 25/day)", () => {
    const limiter = new AlphaVantageRateLimiter();
    expect(limiter.requestsPerMinute).toBe(ALPHA_VANTAGE_DEFAULT_REQUESTS_PER_MINUTE);
    expect(limiter.requestsPerDay).toBe(ALPHA_VANTAGE_DEFAULT_REQUESTS_PER_DAY);
    expect(limiter.requestsPerMinute).toBe(5);
    expect(limiter.requestsPerDay).toBe(25);
  });

  it("allows calls up to the per-minute limit with zero wait, while under the daily cap", async () => {
    const limiter = new AlphaVantageRateLimiter(3, 100);
    for (let i = 0; i < 3; i++) {
      expect(await limiter.getWaitTimeMs()).toBe(0);
      limiter.recordCall();
    }
  });

  it("requires a wait once the per-minute window is exhausted, even with daily capacity remaining", async () => {
    const limiter = new AlphaVantageRateLimiter(2, 100);
    limiter.recordCall();
    limiter.recordCall();

    const waitMs = await limiter.getWaitTimeMs();
    expect(waitMs).toBeGreaterThan(0);
    expect(waitMs).toBeLessThanOrEqual(60_000);
  });

  it("requires a (much longer) wait once the daily window is exhausted, even with per-minute capacity free", async () => {
    const limiter = new AlphaVantageRateLimiter(100, 2);
    limiter.recordCall();
    limiter.recordCall();

    const waitMs = await limiter.getWaitTimeMs();
    expect(waitMs).toBeGreaterThan(60_000);
    expect(waitMs).toBeLessThanOrEqual(24 * 60 * 60_000);
  });

  it("returns the max() of the two independent window waits, not the sum or the min", async () => {
    const limiter = new AlphaVantageRateLimiter(1, 1);
    limiter.recordCall();

    const waitMs = await limiter.getWaitTimeMs();
    // Both windows are now exhausted after a single call; the day window's
    // wait (~24h) dominates, so it must not be diluted by averaging with
    // the much shorter minute-window wait.
    expect(waitMs).toBeGreaterThan(60_000);
  });

  it("frees per-minute capacity once the oldest call falls outside the 60s window, independent of the day window", async () => {
    const limiter = new AlphaVantageRateLimiter(1, 100);
    limiter.recordCall();
    expect(await limiter.getWaitTimeMs()).toBeGreaterThan(0);

    jest.advanceTimersByTime(60_001);

    expect(await limiter.getWaitTimeMs()).toBe(0);
  });
});
