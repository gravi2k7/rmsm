import { Inject, Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import Redis from "ioredis";
import { APP_CONFIG } from "../../../../config/app-config.module";
import type { Env } from "@rmsm/config";

/**
 * BR-001 asks this broker to "reuse existing cache infrastructure" with
 * "TTL configurable." Same reasoning and reused pieces as every provider
 * cache since MD-002 — `REDIS_URL`/`ioredis`, a dedicated `mt5:` key
 * prefix, and a per-call `ttlMs` parameter so `MetaTrader5AccountService`/
 * `MetaTrader5SymbolService` can each cache at the lifetime their own
 * data genuinely needs (see the `MT5_*_TTL_MULTIPLIER` constants).
 */
@Injectable()
export class MetaTrader5CacheService implements OnModuleDestroy {
  private readonly logger = new Logger(MetaTrader5CacheService.name);
  private client: Redis | null = null;

  constructor(@Inject(APP_CONFIG) private readonly env: Env) {}

  async getOrSet<T>(key: string, ttlMs: number, fetcher: () => Promise<T>): Promise<T> {
    const fullKey = `mt5:${key}`;

    const cached = await this.tryGet<T>(fullKey);
    if (cached !== undefined) return cached;

    const fresh = await fetcher();
    await this.trySet(fullKey, fresh, ttlMs);
    return fresh;
  }

  async invalidate(key: string): Promise<void> {
    try {
      await this.getClient().del(`mt5:${key}`);
    } catch (err) {
      this.logger.warn({ msg: "mt5.cache.invalidate_failed", key, error: err instanceof Error ? err.message : String(err) });
    }
  }

  async onModuleDestroy(): Promise<void> {
    this.client?.disconnect();
  }

  private getClient(): Redis {
    if (!this.client) {
      this.client = new Redis(this.env.REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 1 });
      this.client.on("error", (err: Error) => this.logger.warn({ msg: "mt5.cache.connection_error", error: err.message }));
    }
    return this.client;
  }

  private async tryGet<T>(key: string): Promise<T | undefined> {
    try {
      const raw = await this.getClient().get(key);
      if (raw === null) return undefined;
      return JSON.parse(raw) as T;
    } catch (err) {
      this.logger.warn({ msg: "mt5.cache.get_failed", key, error: err instanceof Error ? err.message : String(err) });
      return undefined;
    }
  }

  private async trySet(key: string, value: unknown, ttlMs: number): Promise<void> {
    try {
      await this.getClient().set(key, JSON.stringify(value), "PX", ttlMs);
    } catch (err) {
      this.logger.warn({ msg: "mt5.cache.set_failed", key, error: err instanceof Error ? err.message : String(err) });
    }
  }
}
