import { DashboardService } from "../dashboard.service";
import type { AdminStatsRepository, PlatformCounts } from "../../repositories/admin-stats.repository";
import type { QueueMonitoringService } from "../queue-monitoring.service";
import type { SystemAnnouncementRepository } from "../../repositories/system-announcement.repository";
import type { MaintenanceWindowRepository } from "../../repositories/maintenance-window.repository";

describe("DashboardService", () => {
  it("aggregates platform stats, queues, active announcements, and maintenance state into one response", async () => {
    const counts: PlatformCounts = {
      totalUsers: 10,
      activeUsers: 8,
      totalOrganizations: 3,
      activeSubscriptions: 2,
      notificationsSentToday: 42,
      activeSessions: 5,
    };
    const statsRepository = { getPlatformCounts: jest.fn().mockResolvedValue(counts) } as unknown as jest.Mocked<AdminStatsRepository>;
    const queueMonitoring = {
      getAllQueueSnapshots: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<QueueMonitoringService>;
    const announcementRepository = {
      findActive: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<SystemAnnouncementRepository>;
    const maintenanceRepository = {
      getState: jest.fn().mockResolvedValue({ id: "singleton", isEnabled: false }),
    } as unknown as jest.Mocked<MaintenanceWindowRepository>;

    const service = new DashboardService(statsRepository, queueMonitoring, announcementRepository, maintenanceRepository);
    const dashboard = await service.getSystemDashboard();

    expect(dashboard.platformStats).toEqual(counts);
    expect(dashboard.queues).toEqual([]);
    expect(dashboard.activeAnnouncements).toEqual([]);
    expect(dashboard.maintenance).toEqual({ id: "singleton", isEnabled: false });
    expect(dashboard.generatedAt).toEqual(expect.any(String));
  });
});
