import { YahooFinanceRateLimiter } from "../yahoo-finance.rate-limit";
import { YAHOO_DEFAULT_REQUESTS_PER_MINUTE } from "../yahoo-finance.constants";

describe("YahooFinanceRateLimiter", () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("defaults to YAHOO_DEFAULT_REQUESTS_PER_MINUTE", () => {
    const limiter = new YahooFinanceRateLimiter();
    expect(limiter.requestsPerMinute).toBe(YAHOO_DEFAULT_REQUESTS_PER_MINUTE);
  });

  it("allows calls up to the configured limit with zero wait", async () => {
    const limiter = new YahooFinanceRateLimiter(3);
    for (let i = 0; i < 3; i++) {
      expect(await limiter.getWaitTimeMs()).toBe(0);
      limiter.recordCall();
    }
  });

  it("requires a wait once the limit is reached within the 60s window", async () => {
    const limiter = new YahooFinanceRateLimiter(2);
    limiter.recordCall();
    limiter.recordCall();

    const waitMs = await limiter.getWaitTimeMs();
    expect(waitMs).toBeGreaterThan(0);
    expect(waitMs).toBeLessThanOrEqual(60_000);
  });

  it("frees capacity once the oldest call falls outside the sliding window", async () => {
    const limiter = new YahooFinanceRateLimiter(1);
    limiter.recordCall();
    expect(await limiter.getWaitTimeMs()).toBeGreaterThan(0);

    jest.advanceTimersByTime(60_001);

    expect(await limiter.getWaitTimeMs()).toBe(0);
  });
});
