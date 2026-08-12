import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { AuthModule } from "../auth/auth.module";
import { BillingModule } from "../billing/billing.module";
import { LicensingModule } from "../licensing/licensing.module";
import { MarketDataModule } from "../market-data/market-data.module";
import { AiModule } from "../ai/ai.module";
import { PlatformSettingRepository } from "./repositories/platform-setting.repository";
import { SystemAnnouncementRepository } from "./repositories/system-announcement.repository";
import { MaintenanceWindowRepository } from "./repositories/maintenance-window.repository";
import { AdminStatsRepository } from "./repositories/admin-stats.repository";
import { DashboardService } from "./services/dashboard.service";
import { ConfigurationService } from "./services/configuration.service";
import { FeatureFlagAdminService } from "./services/feature-flag-admin.service";
import { QueueMonitoringService } from "./services/queue-monitoring.service";
import { HealthDashboardService } from "./services/health-dashboard.service";
import { CacheManagementService } from "./services/cache-management.service";
import { StorageManagementService } from "./services/storage-management.service";
import { AnnouncementService } from "./services/announcement.service";
import { MaintenanceModeService } from "./services/maintenance-mode.service";
import { MaintenanceModeMiddleware } from "./middleware/maintenance-mode.middleware";
import { AdminController } from "./admin.controller";

/**
 * Domain 1 — Enterprise Administration. Imports BillingModule (existing
 * FeatureFlagRepository — extended, not duplicated), LicensingModule
 * (License, shared with Domain 2 — see licensing.module.ts for why it's
 * standalone), MarketDataModule + AiModule (existing health-check
 * surfaces, Health Dashboard). AdminModule imports these; none of them
 * import AdminModule back — no circular dependency.
 */
@Module({
  imports: [
    AuthModule,
    BillingModule,
    LicensingModule,
    MarketDataModule,
    AiModule,
    BullModule.registerQueue(
      { name: "email" },
      { name: "sms" },
      { name: "push" },
      { name: "digest" },
      { name: "scheduled" },
    ),
  ],
  controllers: [AdminController],
  providers: [
    PlatformSettingRepository,
    SystemAnnouncementRepository,
    MaintenanceWindowRepository,
    AdminStatsRepository,
    DashboardService,
    ConfigurationService,
    FeatureFlagAdminService,
    QueueMonitoringService,
    HealthDashboardService,
    CacheManagementService,
    StorageManagementService,
    AnnouncementService,
    MaintenanceModeService,
    MaintenanceModeMiddleware,
  ],
  exports: [MaintenanceModeMiddleware, MaintenanceWindowRepository],
})
export class AdminModule {}
