import { Inject, Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import Redis from "ioredis";
import { APP_CONFIG } from "../../../../config/app-config.module";
import type { Env } from "@rmsm/config";

/**
 * MD-003 asks this provider to "reuse existing Redis cache" with
 * "configurable TTL values." Same reasoning and same reused pieces as
 * `CoinGeckoCacheService` (coingecko.cache.ts, MD-002) — no shared,
 * generic `CacheService` exists anywhere in this codebase to import, so
 * this reuses the same `REDIS_URL` (`@rmsm/config`), the same `ioredis`
 * client library `HealthController` already depends on, and the same
 * `MARKET_DATA_CACHE_TTL_MS` base TTL — with one addition:
 * `getOrSet()` here takes an explicit `ttlMs` per call rather than
 * baking in one fixed value, so `AlphaVantageProvider` can cache Current
 * Quote / Historical Series / Company Overview / Exchange Rates at
 * DIFFERENT TTLs (see the `ALPHA_VANTAGE_*_TTL_MULTIPLIER` constants),
 * genuinely satisfying "configurable TTL values" rather than one TTL
 * applied uniformly regardless of how often each data category actually
 * changes.
 */
@Injectable()
export class AlphaVantageCacheService implements OnModuleDestroy {
  private readonly logger = new Logger(AlphaVantageCacheService.name);
  private client: Redis | null = null;

  constructor(@Inject(APP_CONFIG) private readonly env: Env) {}

  async getOrSet<T>(key: string, ttlMs: number, fetcher: () => Promise<T>): Promise<T> {
    const fullKey = `alphavantage:${key}`;

    const cached = await this.tryGet<T>(fullKey);
    if (cached !== undefined) return cached;

    const fresh = await fetcher();
    await this.trySet(fullKey, fresh, ttlMs);
    return fresh;
  }

  async onModuleDestroy(): Promise<void> {
    this.client?.disconnect();
  }

  private getClient(): Redis {
    if (!this.client) {
      this.client = new Redis(this.env.REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 1 });
      this.client.on("error", (err: Error) => this.logger.warn({ msg: "alphavantage.cache.connection_error", error: err.message }));
    }
    return this.client;
  }

  private async tryGet<T>(key: string): Promise<T | undefined> {
    try {
      const raw = await this.getClient().get(key);
      if (raw === null) return undefined;
      return JSON.parse(raw) as T;
    } catch (err) {
      this.logger.warn({ msg: "alphavantage.cache.get_failed", key, error: err instanceof Error ? err.message : String(err) });
      return undefined;
    }
  }

  private async trySet(key: string, value: unknown, ttlMs: number): Promise<void> {
    try {
      await this.getClient().set(key, JSON.stringify(value), "PX", ttlMs);
    } catch (err) {
      this.logger.warn({ msg: "alphavantage.cache.set_failed", key, error: err instanceof Error ? err.message : String(err) });
    }
  }
}
