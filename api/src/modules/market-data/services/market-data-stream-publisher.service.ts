import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import Redis from "ioredis";
import { loadConfig } from "@rmsm/config";

/** Every Redis Stream this publisher writes to — one per event family, so a consumer only interested in e.g. gap events doesn't have to filter a firehose of tick events out of a single shared stream. Matches the prompt's own explicit consumer list (Dashboard, Strategy Platform, Risk Platform, AI Platform, Notification Platform) — different consumers plausibly want different subsets. */
export const MARKET_DATA_STREAMS = {
  PROVIDER: "market-data:stream:provider",
  IMPORT: "market-data:stream:import",
  TICK: "market-data:stream:tick",
  CANDLE: "market-data:stream:candle",
  GAP: "market-data:stream:gap",
  DERIVED: "market-data:stream:derived",
} as const;

export type MarketDataStreamName = (typeof MARKET_DATA_STREAMS)[keyof typeof MARKET_DATA_STREAMS];

/** Caps each stream so it can't grow unbounded if a consumer group falls behind or nobody's reading — an approximate trim (Redis's own `~` MAXLEN form), not an exact one, since exact trimming is O(N) per XADD and this is a high-frequency write path (tick/candle events). */
const STREAM_MAXLEN = 100_000;

/**
 * FIP-001 Domain 9 (Streaming Pipeline). The existing DomainEventPublisher
 * (Module 004/005's shared in-process EventEmitter) has no cross-process
 * reach — nothing outside this Node process can ever observe an event it
 * publishes. The prompt's own consumer list (Dashboard, Strategy
 * Platform, Risk Platform, AI Platform, Notification Platform) are
 * separate processes/services, so this publisher writes the same
 * events to Redis Streams via XADD, which any of them can consume with
 * XREAD/XREADGROUP independently of this API process's lifetime.
 *
 * Deliberately its own Redis connection (own `new Redis(...)`, own
 * `lazyConnect`), not a shared DI token — same established pattern as
 * CacheManagementService and every market-data provider's own `.cache.ts`
 * file in this codebase; there is no shared Redis-client provider/module
 * to inject here.
 */
@Injectable()
export class MarketDataStreamPublisherService implements OnModuleDestroy {
  private readonly logger = new Logger(MarketDataStreamPublisherService.name);
  private client: Redis | null = null;

  private getClient(): Redis {
    if (!this.client) {
      this.client = new Redis(loadConfig().REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 1 });
    }
    return this.client;
  }

  /**
   * Publishes one event onto the given stream. Never throws — a Redis
   * outage shouldn't fail the calling business operation (e.g. an
   * import completing successfully must not roll back or error out
   * just because the streaming side-channel is unreachable); logged
   * instead, same "best-effort, non-blocking side channel" contract as
   * WebhookEventBridge's own forwarding in Module 005.
   */
  async publish(stream: MarketDataStreamName, eventType: string, payload: Record<string, unknown>): Promise<void> {
    try {
      const redis = this.getClient();
      if (redis.status === "wait" || redis.status === "end") {
        await redis.connect();
      }
      const fields: string[] = ["eventType", eventType, "payload", JSON.stringify(payload), "publishedAt", new Date().toISOString()];
      await redis.xadd(stream, "MAXLEN", "~", STREAM_MAXLEN, "*", ...fields);
    } catch (error) {
      this.logger.warn(`Failed to publish ${eventType} to stream ${stream}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client) {
      await this.client.quit().catch(() => undefined);
    }
  }
}
