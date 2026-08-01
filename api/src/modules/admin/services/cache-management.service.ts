import { Injectable } from "@nestjs/common";
import Redis from "ioredis";
import { loadConfig } from "@rmsm/config";
import { AuditService, AuditContext } from "../../auth/services/audit.service";

export interface CacheStats {
  usedMemoryHuman: string;
  keyspaceHits: number;
  keyspaceMisses: number;
  connectedClients: number;
  totalKeys: number;
}

/**
 * Domain 1's Cache Management / Redis Monitoring — the same Redis
 * instance BullMQ (QueueModule) already connects to, read via `INFO` for
 * stats and `SCAN`/`DEL` for prefix-scoped clearing. Deliberately never
 * exposes FLUSHALL/FLUSHDB — clearing is always scoped to an explicit key
 * prefix the caller supplies, so this can't be used to wipe BullMQ's own
 * job data by accident.
 */
@Injectable()
export class CacheManagementService {
  private readonly redisUrl: string;

  constructor(private readonly auditService: AuditService) {
    this.redisUrl = loadConfig().REDIS_URL;
  }

  private client(): Redis {
    return new Redis(this.redisUrl, { lazyConnect: true, maxRetriesPerRequest: 1 });
  }

  async getStats(): Promise<CacheStats> {
    const redis = this.client();
    try {
      await redis.connect();
      const info = await redis.info();
      const parse = (key: string): string => info.match(new RegExp(`${key}:(.*)`))?.[1]?.trim() ?? "0";
      const totalKeys = await redis.dbsize();
      return {
        usedMemoryHuman: parse("used_memory_human"),
        keyspaceHits: Number(parse("keyspace_hits")),
        keyspaceMisses: Number(parse("keyspace_misses")),
        connectedClients: Number(parse("connected_clients")),
        totalKeys,
      };
    } finally {
      redis.disconnect();
    }
  }

  async clearByPrefix(prefix: string, actorId: string, ctx: AuditContext = {}): Promise<{ deletedCount: number }> {
    if (!prefix || prefix.trim().length === 0) {
      throw new Error("A non-empty key prefix is required — clearing the entire cache is not supported.");
    }
    const redis = this.client();
    let deletedCount = 0;
    try {
      await redis.connect();
      let cursor = "0";
      do {
        const [next, keys] = await redis.scan(cursor, "MATCH", `${prefix}*`, "COUNT", 100);
        cursor = next;
        if (keys.length > 0) {
          deletedCount += await redis.del(...keys);
        }
      } while (cursor !== "0");
    } finally {
      redis.disconnect();
    }

    await this.auditService.log("cache.cleared", {
      userId: actorId,
      entityType: "Cache",
      entityId: prefix,
      metadata: { deletedCount },
      ...ctx,
    });
    return { deletedCount };
  }
}
