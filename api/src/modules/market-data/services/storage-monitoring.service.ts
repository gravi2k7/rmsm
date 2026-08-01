import { Injectable } from "@nestjs/common";
import { prisma, DbClient } from "@rmsm/database";

export interface TableStorageStat {
  tableName: string;
  totalBytes: number;
  totalSizePretty: string;
}

/**
 * FIP-001 Domain 8 (Time-Series Storage) + Domain 11's "Storage Usage"
 * dashboard tile. Same honest `pg_total_relation_size()` pattern as
 * Module 005's `AdminStatsRepository.getTableStorageStats()` (this
 * repo's own established precedent for storage reporting — no blob
 * storage subsystem exists to report on instead), applied here to
 * market-data's own tables specifically, which Module 005's admin
 * repository does not cover. See `TIMESCALEDB_READINESS.md` (delivered
 * alongside this module) for the Domain 8 partition/compression/
 * retention/TimescaleDB-migration design this service's numbers inform.
 */
@Injectable()
export class StorageMonitoringService {
  private static readonly TABLES = [
    "market_candles",
    "market_ticks",
    "market_quotes",
    "data_import_jobs",
    "data_gaps",
    "data_quality_issues",
    "candle_quality_metadata",
    "derived_indicator_snapshots",
    "market_data_ai_snapshots",
  ];

  async getTableStorageStats(client: DbClient = prisma): Promise<TableStorageStat[]> {
    const results: TableStorageStat[] = [];
    for (const tableName of StorageMonitoringService.TABLES) {
      const rows = await client.$queryRawUnsafe<{ total_bytes: bigint; pretty: string }[]>(
        `SELECT pg_total_relation_size($1) AS total_bytes, pg_size_pretty(pg_total_relation_size($1)) AS pretty`,
        tableName,
      );
      const row = rows[0];
      results.push({ tableName, totalBytes: row ? Number(row.total_bytes) : 0, totalSizePretty: row ? row.pretty : "0 bytes" });
    }
    return results;
  }

  async getTotalBytes(client: DbClient = prisma): Promise<number> {
    const stats = await this.getTableStorageStats(client);
    return stats.reduce((sum, s) => sum + s.totalBytes, 0);
  }
}
