import { Injectable } from "@nestjs/common";
import { AdminStatsRepository, TableStorageStat } from "../repositories/admin-stats.repository";

/** Domain 1's Storage Management — see schema.prisma's Module 005 design note 3 for why this is Postgres table-size monitoring rather than a fabricated blob-storage backend. */
@Injectable()
export class StorageManagementService {
  constructor(private readonly statsRepository: AdminStatsRepository) {}

  getStorageStats(): Promise<TableStorageStat[]> {
    return this.statsRepository.getTableStorageStats();
  }
}
