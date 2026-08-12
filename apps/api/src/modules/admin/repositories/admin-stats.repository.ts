import { Injectable } from "@nestjs/common";
import { prisma, DbClient } from "@rmsm/database";

export interface PlatformCounts {
  totalUsers: number;
  activeUsers: number;
  totalOrganizations: number;
  activeSubscriptions: number;
  notificationsSentToday: number;
  activeSessions: number;
}

export interface TableStorageStat {
  tableName: string;
  totalBytes: number;
  totalSizePretty: string;
}

/**
 * Cross-domain read-only aggregation for Domain 1's System Dashboard /
 * Platform Statistics / Storage Management — deliberately its own
 * repository (rather than bolted onto UserRepository or
 * OrganizationRepository) since these are cross-cutting counts spanning
 * several completed modules' own tables, not entity CRUD for any single
 * one of them. Every count below reads tables Modules 002-004 already
 * own; this repository does not write to any of them.
 */
@Injectable()
export class AdminStatsRepository {
  async getPlatformCounts(client: DbClient = prisma): Promise<PlatformCounts> {
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);

    const [totalUsers, activeUsers, totalOrganizations, activeSubscriptions, notificationsSentToday, activeSessions] =
      await Promise.all([
        client.user.count(),
        client.user.count({ where: { status: "ACTIVE" } }),
        client.organization.count({ where: { deletedAt: null } }),
        client.organizationSubscription.count({ where: { status: { in: ["ACTIVE", "TRIALING"] } } }),
        client.notification.count({ where: { createdAt: { gte: startOfDay }, status: "SENT" } }),
        client.session.count({ where: { revokedAt: null, expiresAt: { gt: new Date() } } }),
      ]);

    return { totalUsers, activeUsers, totalOrganizations, activeSubscriptions, notificationsSentToday, activeSessions };
  }

  /**
   * Storage Management (Domain 1): honest Postgres table-size monitoring
   * over the platform's genuinely largest, still-growing tables — this
   * repo has no blob-storage subsystem to report on instead (see
   * schema.prisma's Module 005 design note 3). Raw SQL is the only way to
   * reach `pg_total_relation_size`; Prisma's query builder has no
   * equivalent. Table names are a fixed, hardcoded allowlist (never
   * interpolated from caller input) specifically to keep this safe
   * despite being a raw query.
   */
  async getTableStorageStats(client: DbClient = prisma): Promise<TableStorageStat[]> {
    const tables = [
      "audit_logs",
      "notifications",
      "notification_deliveries",
      "notification_logs",
      "sessions",
      "login_history",
    ];
    const results: TableStorageStat[] = [];
    for (const tableName of tables) {
      const rows = await client.$queryRawUnsafe<{ total_bytes: bigint; pretty: string }[]>(
        `SELECT pg_total_relation_size($1) AS total_bytes, pg_size_pretty(pg_total_relation_size($1)) AS pretty`,
        tableName,
      );
      const row = rows[0];
      results.push({
        tableName,
        totalBytes: row ? Number(row.total_bytes) : 0,
        totalSizePretty: row ? row.pretty : "0 bytes",
      });
    }
    return results;
  }
}
