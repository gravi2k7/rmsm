import { AiRateLimiterService } from "../gateway/ai-rate-limiter.service";
import { AiGatewayConfigService } from "../config/ai-gateway-config.service";
import { RateLimitExceededError } from "../errors/ai-gateway.errors";

function buildLimiter(limitPerMinute: number): AiRateLimiterService {
  const config = { rateLimitPerMinute: limitPerMinute } as unknown as AiGatewayConfigService;
  return new AiRateLimiterService(config);
}

describe("AiRateLimiterService — a real token bucket", () => {
  it("allows calls up to the configured limit", () => {
    const limiter = buildLimiter(3);
    expect(() => limiter.consume("org1")).not.toThrow();
    expect(() => limiter.consume("org1")).not.toThrow();
    expect(() => limiter.consume("org1")).not.toThrow();
  });

  it("throws RateLimitExceededError once the limit is exhausted within the same window", () => {
    const limiter = buildLimiter(2);
    limiter.consume("org1");
    limiter.consume("org1");
    expect(() => limiter.consume("org1")).toThrow(RateLimitExceededError);
  });

  it("scopes buckets independently per key — org1 exhausting its quota does not affect org2", () => {
    const limiter = buildLimiter(1);
    limiter.consume("org1");
    expect(() => limiter.consume("org1")).toThrow(RateLimitExceededError);
    expect(() => limiter.consume("org2")).not.toThrow();
  });

  it("remaining() reports the real current token count for a scope, and the full limit for one never consumed", () => {
    const limiter = buildLimiter(5);
    expect(limiter.remaining("org1")).toBe(5);
    limiter.consume("org1");
    expect(limiter.remaining("org1")).toBe(4);
  });

  it("defaults to a shared 'global' scope when no key is supplied", () => {
    const limiter = buildLimiter(1);
    limiter.consume();
    expect(() => limiter.consume()).toThrow(RateLimitExceededError);
  });
});
