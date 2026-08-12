import { Injectable } from "@nestjs/common";
import { AdminStatsRepository, PlatformCounts } from "../repositories/admin-stats.repository";
import { QueueMonitoringService, QueueSnapshot } from "./queue-monitoring.service";
import { SystemAnnouncementRepository } from "../repositories/system-announcement.repository";
import { MaintenanceWindowRepository } from "../repositories/maintenance-window.repository";
import type { SystemAnnouncement, MaintenanceWindow } from "@rmsm/database";

export interface SystemDashboard {
  platformStats: PlatformCounts;
  queues: QueueSnapshot[];
  activeAnnouncements: SystemAnnouncement[];
  maintenance: MaintenanceWindow;
  generatedAt: string;
}

/** Domain 1's "System Dashboard" / "Platform Statistics" — a single read aggregating every other Domain 1 read model into one response, for /admin/dashboard. */
@Injectable()
export class DashboardService {
  constructor(
    private readonly statsRepository: AdminStatsRepository,
    private readonly queueMonitoring: QueueMonitoringService,
    private readonly announcementRepository: SystemAnnouncementRepository,
    private readonly maintenanceRepository: MaintenanceWindowRepository,
  ) {}

  async getSystemDashboard(): Promise<SystemDashboard> {
    const [platformStats, queues, activeAnnouncements, maintenance] = await Promise.all([
      this.statsRepository.getPlatformCounts(),
      this.queueMonitoring.getAllQueueSnapshots(),
      this.announcementRepository.findActive(new Date()),
      this.maintenanceRepository.getState(),
    ]);
    return { platformStats, queues, activeAnnouncements, maintenance, generatedAt: new Date().toISOString() };
  }

  getPlatformStats(): Promise<PlatformCounts> {
    return this.statsRepository.getPlatformCounts();
  }
}
