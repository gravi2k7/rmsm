import { Inject, Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import Redis from "ioredis";
import { APP_CONFIG } from "../../../../config/app-config.module";
import type { Env } from "@rmsm/config";

/**
 * EM-001's own Cache section: "Reuse existing cache infrastructure. Cache:
 * Templates, Provider Configuration. TTL configurable." Same
 * `ioredis`/`REDIS_URL` reuse and cache-aside discipline as every
 * provider cache since MD-002/BR-001 — the same `getOrSet()` shape,
 * `email:` key prefix, never throws (a Redis outage degrades to a plain
 * cache miss, not a platform outage).
 */
@Injectable()
export class EmailCacheService implements OnModuleDestroy {
  private readonly logger = new Logger(EmailCacheService.name);
  private client: Redis | null = null;

  constructor(@Inject(APP_CONFIG) private readonly env: Env) {}

  async getOrSet<T>(key: string, ttlMs: number, fetcher: () => Promise<T>): Promise<T> {
    const fullKey = `email:${key}`;
    const cached = await this.tryGet<T>(fullKey);
    if (cached !== undefined) return cached;

    const fresh = await fetcher();
    await this.trySet(fullKey, fresh, ttlMs);
    return fresh;
  }

  async invalidate(key: string): Promise<void> {
    try {
      await this.getClient().del(`email:${key}`);
    } catch (err) {
      this.logger.warn({ msg: "email.cache.invalidate_failed", key, error: err instanceof Error ? err.message : String(err) });
    }
  }

  async onModuleDestroy(): Promise<void> {
    this.client?.disconnect();
  }

  private getClient(): Redis {
    if (!this.client) {
      this.client = new Redis(this.env.REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 1 });
      this.client.on("error", (err: Error) => this.logger.warn({ msg: "email.cache.connection_error", error: err.message }));
    }
    return this.client;
  }

  private async tryGet<T>(key: string): Promise<T | undefined> {
    try {
      const raw = await this.getClient().get(key);
      if (raw === null) return undefined;
      return JSON.parse(raw) as T;
    } catch (err) {
      this.logger.warn({ msg: "email.cache.get_failed", key, error: err instanceof Error ? err.message : String(err) });
      return undefined;
    }
  }

  private async trySet(key: string, value: unknown, ttlMs: number): Promise<void> {
    try {
      await this.getClient().set(key, JSON.stringify(value), "PX", ttlMs);
    } catch (err) {
      this.logger.warn({ msg: "email.cache.set_failed", key, error: err instanceof Error ? err.message : String(err) });
    }
  }
}
