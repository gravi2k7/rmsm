import { TwelveDataRateLimiter, TWELVE_DATA_DEFAULT_REQUESTS_PER_MINUTE } from "../twelve-data.rate-limit";

describe("TwelveDataRateLimiter", () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("defaults to Twelve Data's free-tier ceiling of 8 requests/minute", () => {
    const limiter = new TwelveDataRateLimiter();
    expect(limiter.requestsPerMinute).toBe(TWELVE_DATA_DEFAULT_REQUESTS_PER_MINUTE);
    expect(limiter.requestsPerMinute).toBe(8);
  });

  it("allows calls up to the configured limit with zero wait", async () => {
    const limiter = new TwelveDataRateLimiter(3);
    for (let i = 0; i < 3; i++) {
      expect(await limiter.getWaitTimeMs()).toBe(0);
      limiter.recordCall();
    }
  });

  it("requires a wait once the limit is reached within the window", async () => {
    const limiter = new TwelveDataRateLimiter(2);
    limiter.recordCall();
    limiter.recordCall();

    const waitMs = await limiter.getWaitTimeMs();
    expect(waitMs).toBeGreaterThan(0);
    expect(waitMs).toBeLessThanOrEqual(60_000);
  });

  it("frees up capacity once the oldest call falls outside the 60s sliding window", async () => {
    const limiter = new TwelveDataRateLimiter(1);
    limiter.recordCall();
    expect(await limiter.getWaitTimeMs()).toBeGreaterThan(0);

    jest.advanceTimersByTime(60_001);

    expect(await limiter.getWaitTimeMs()).toBe(0);
  });

  it("never exceeds the configured limit even across many recordCall() invocations", async () => {
    const limiter = new TwelveDataRateLimiter(5);
    for (let i = 0; i < 5; i++) limiter.recordCall();

    expect(await limiter.getWaitTimeMs()).toBeGreaterThan(0);
  });
});
