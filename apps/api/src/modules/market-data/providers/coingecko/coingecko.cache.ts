import { Inject, Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import Redis from "ioredis";
import { APP_CONFIG } from "../../../../config/app-config.module";
import type { Env } from "@rmsm/config";

/**
 * MD-002 asks this provider to "reuse existing Redis caching." There is
 * no shared, generic `CacheService` anywhere in this codebase today to
 * reuse (confirmed: the only existing Redis usage in `api/src` is
 * `QueueModule`'s BullMQ connection — internal to BullMQ, not exposed as
 * a reusable client — and `HealthController`'s one-shot readiness ping).
 * What genuinely IS reused here: the same Redis instance
 * (`REDIS_URL`, already validated by `@rmsm/config`), the same
 * `ioredis` client library (already a direct `@rmsm/api` dependency,
 * the exact import `HealthController` already uses), and the same cache
 * TTL AI-101 already defined for Market Data (`MARKET_DATA_CACHE_TTL_MS`
 * / `getMarketConfig().cacheTtlMs`) — introducing a second,
 * CoinGecko-specific TTL var would have been the actual duplicate
 * abstraction MD-002 says not to introduce. This class is the minimal
 * connector needed to use all three from this one provider; it is not a
 * new generic caching framework.
 *
 * Cache-aside, not read-through at the interface level: `getOrSet()`
 * only ever wraps client calls that are ALREADY being made — if Redis is
 * unreachable, every cache operation degrades to a plain miss (logged,
 * not thrown) and `fetcher()` still runs, so a Redis outage can never
 * take this provider down with it.
 */
@Injectable()
export class CoinGeckoCacheService implements OnModuleDestroy {
  private readonly logger = new Logger(CoinGeckoCacheService.name);
  private client: Redis | null = null;

  constructor(@Inject(APP_CONFIG) private readonly env: Env) {}

  async getOrSet<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    const fullKey = `coingecko:${key}`;

    const cached = await this.tryGet<T>(fullKey);
    if (cached !== undefined) return cached;

    const fresh = await fetcher();
    await this.trySet(fullKey, fresh);
    return fresh;
  }

  async onModuleDestroy(): Promise<void> {
    this.client?.disconnect();
  }

  private getClient(): Redis {
    if (!this.client) {
      // lazyConnect: the actual TCP connection is deferred to the first
      // command ioredis is asked to run, not opened here — matching
      // HealthController's precedent for constructing a Redis client
      // from `@rmsm/config`'s validated REDIS_URL.
      this.client = new Redis(this.env.REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 1 });
      this.client.on("error", (err: Error) => this.logger.warn({ msg: "coingecko.cache.connection_error", error: err.message }));
    }
    return this.client;
  }

  private async tryGet<T>(key: string): Promise<T | undefined> {
    try {
      const raw = await this.getClient().get(key);
      if (raw === null) return undefined;
      return JSON.parse(raw) as T;
    } catch (err) {
      this.logger.warn({ msg: "coingecko.cache.get_failed", key, error: err instanceof Error ? err.message : String(err) });
      return undefined;
    }
  }

  private async trySet(key: string, value: unknown): Promise<void> {
    try {
      await this.getClient().set(key, JSON.stringify(value), "PX", this.env.MARKET_DATA_CACHE_TTL_MS);
    } catch (err) {
      this.logger.warn({ msg: "coingecko.cache.set_failed", key, error: err instanceof Error ? err.message : String(err) });
    }
  }
}
