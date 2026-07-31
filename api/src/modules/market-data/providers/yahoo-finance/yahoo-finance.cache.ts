import { Inject, Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import Redis from "ioredis";
import { APP_CONFIG } from "../../../../config/app-config.module";
import type { Env } from "@rmsm/config";

/**
 * MD-004 asks this provider to "reuse existing cache architecture" with
 * "TTL must be configurable." Same reasoning and reused pieces as
 * `AlphaVantageCacheService` (MD-003) — `REDIS_URL` (`@rmsm/config`),
 * the same `ioredis` client library, and a per-call `ttlMs` parameter
 * (rather than one fixed TTL) so `YahooFinanceProvider` can cache
 * Company Profile / Financial Statements / Dividends / Splits /
 * Earnings / Historical Data / ETF Metadata at the different lifetimes
 * each genuinely needs (see the `YAHOO_*_TTL_MULTIPLIER` constants).
 * Unlike `MARKET_DATA_CACHE_TTL_MS` (shared across every other
 * provider), this provider's base TTL is its own dedicated
 * `YAHOO_CACHE_TTL` env var (seconds), per MD-004's Configuration
 * section — converted to milliseconds by `YahooFinanceProvider`, not by
 * this cache service, so this class stays unit-agnostic like every
 * other provider cache in this module.
 */
@Injectable()
export class YahooFinanceCacheService implements OnModuleDestroy {
  private readonly logger = new Logger(YahooFinanceCacheService.name);
  private client: Redis | null = null;

  constructor(@Inject(APP_CONFIG) private readonly env: Env) {}

  async getOrSet<T>(key: string, ttlMs: number, fetcher: () => Promise<T>): Promise<T> {
    const fullKey = `yahoo:${key}`;

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
      this.client.on("error", (err: Error) => this.logger.warn({ msg: "yahoo.cache.connection_error", error: err.message }));
    }
    return this.client;
  }

  private async tryGet<T>(key: string): Promise<T | undefined> {
    try {
      const raw = await this.getClient().get(key);
      if (raw === null) return undefined;
      return JSON.parse(raw) as T;
    } catch (err) {
      this.logger.warn({ msg: "yahoo.cache.get_failed", key, error: err instanceof Error ? err.message : String(err) });
      return undefined;
    }
  }

  private async trySet(key: string, value: unknown, ttlMs: number): Promise<void> {
    try {
      await this.getClient().set(key, JSON.stringify(value), "PX", ttlMs);
    } catch (err) {
      this.logger.warn({ msg: "yahoo.cache.set_failed", key, error: err instanceof Error ? err.message : String(err) });
    }
  }
}
