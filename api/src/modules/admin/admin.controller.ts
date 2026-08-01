import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { RequirePermissions } from "../auth/decorators/permissions.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { AccessTokenPayload } from "../auth/services/token.service";
import { DashboardService, SystemDashboard } from "./services/dashboard.service";
import { ConfigurationService, SafeEnvironmentSnapshot } from "./services/configuration.service";
import { FeatureFlagAdminService } from "./services/feature-flag-admin.service";
import { QueueMonitoringService, QueueSnapshot } from "./services/queue-monitoring.service";
import { HealthDashboardService, HealthDashboard } from "./services/health-dashboard.service";
import { CacheManagementService, CacheStats } from "./services/cache-management.service";
import { StorageManagementService } from "./services/storage-management.service";
import { AnnouncementService } from "./services/announcement.service";
import { MaintenanceModeService } from "./services/maintenance-mode.service";
import { LicenseService } from "../licensing/services/license.service";
import type { FeatureFlag, License, MaintenanceWindow, PlatformSetting, SystemAnnouncement, PaginatedResult } from "@rmsm/database";
import { CreateFeatureFlagDto } from "../billing/dto/create-feature-flag.dto";
import { UpsertPlatformSettingDto } from "./dto/upsert-platform-setting.dto";
import { UpdateFeatureFlagDto } from "./dto/update-feature-flag.dto";
import { ToggleFeatureFlagDto } from "./dto/toggle-feature-flag.dto";
import { CreateAnnouncementDto } from "./dto/create-announcement.dto";
import { UpdateAnnouncementDto } from "./dto/update-announcement.dto";
import { EnableMaintenanceDto } from "./dto/enable-maintenance.dto";
import { ClearCacheDto } from "./dto/clear-cache.dto";
import { IssueLicenseDto } from "../licensing/dto/issue-license.dto";
import { AssignLicenseDto } from "../licensing/dto/assign-license.dto";
import { LicenseQueryDto } from "../licensing/dto/license-query.dto";
import { TableStorageStat } from "./repositories/admin-stats.repository";

/**
 * Domain 1 — Enterprise Administration. Platform-wide (not organization-
 * scoped), gated by platform-level RBAC permissions alone — same shape
 * Module 004's admin surfaces and NotificationsModule's
 * AdminNotificationController already established (no OrganizationRoleGuard
 * anywhere in this controller).
 */
@ApiTags("Admin")
@ApiBearerAuth()
@Controller("admin")
export class AdminController {
  constructor(
    private readonly dashboardService: DashboardService,
    private readonly configurationService: ConfigurationService,
    private readonly featureFlagAdminService: FeatureFlagAdminService,
    private readonly queueMonitoring: QueueMonitoringService,
    private readonly healthDashboardService: HealthDashboardService,
    private readonly cacheManagementService: CacheManagementService,
    private readonly storageManagementService: StorageManagementService,
    private readonly announcementService: AnnouncementService,
    private readonly maintenanceModeService: MaintenanceModeService,
    private readonly licenseService: LicenseService,
  ) {}

  // ── System Dashboard / Platform Statistics ──────────────────────────
  @Get("dashboard")
  @RequirePermissions("admin.dashboard.read")
  @ApiOperation({ summary: "Aggregate system dashboard: platform stats, queues, active announcements, maintenance state." })
  getDashboard(): Promise<SystemDashboard> {
    return this.dashboardService.getSystemDashboard();
  }

  // ── Application / Environment Configuration / Platform Settings ────
  @Get("configuration")
  @RequirePermissions("admin.configuration.manage")
  @ApiOperation({ summary: "List platform settings, optionally filtered by category." })
  listConfiguration(@Query("category") category?: string): Promise<PlatformSetting[]> {
    return this.configurationService.listSettings(category);
  }

  @Get("configuration/environment")
  @RequirePermissions("admin.configuration.manage")
  @ApiOperation({ summary: "Read-only, secret-redacted environment snapshot (NODE_ENV, DB/Redis hostnames only)." })
  getEnvironment(): SafeEnvironmentSnapshot {
    return this.configurationService.getEnvironmentSnapshot();
  }

  @Put("configuration")
  @RequirePermissions("admin.configuration.manage")
  @ApiOperation({ summary: "Create or update a platform setting." })
  upsertConfiguration(
    @Body() dto: UpsertPlatformSettingDto,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<PlatformSetting> {
    return this.configurationService.upsertSetting(dto, user.sub);
  }

  @Delete("configuration/:key")
  @RequirePermissions("admin.configuration.manage")
  @ApiOperation({ summary: "Delete a platform setting by key." })
  async deleteConfiguration(@Param("key") key: string, @CurrentUser() user: AccessTokenPayload): Promise<{ deleted: true }> {
    await this.configurationService.deleteSetting(key, user.sub);
    return { deleted: true };
  }

  // ── Feature Flag Management ─────────────────────────────────────────
  @Get("feature-flags")
  @RequirePermissions("admin.feature-flags.manage")
  @ApiOperation({ summary: "List all feature flags (Domain 1 toggle state + Domain 2 plan-entitlement definition)." })
  listFeatureFlags(): Promise<FeatureFlag[]> {
    return this.featureFlagAdminService.listAll();
  }

  @Post("feature-flags")
  @RequirePermissions("admin.feature-flags.manage")
  @ApiOperation({ summary: "Create a new feature flag." })
  createFeatureFlag(@Body() dto: CreateFeatureFlagDto, @CurrentUser() user: AccessTokenPayload): Promise<FeatureFlag> {
    return this.featureFlagAdminService.create(dto, user.sub);
  }

  @Patch("feature-flags/:id")
  @RequirePermissions("admin.feature-flags.manage")
  @ApiOperation({ summary: "Update a feature flag's name/description." })
  updateFeatureFlag(
    @Param("id") id: string,
    @Body() dto: UpdateFeatureFlagDto,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<FeatureFlag> {
    return this.featureFlagAdminService.update(id, dto, user.sub);
  }

  @Patch("feature-flags/:id/toggle")
  @RequirePermissions("admin.feature-flags.manage")
  @ApiOperation({ summary: "Enable/disable a feature flag — publishes FeatureFlagChanged." })
  toggleFeatureFlag(
    @Param("id") id: string,
    @Body() dto: ToggleFeatureFlagDto,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<FeatureFlag> {
    return this.featureFlagAdminService.setEnabled(id, dto.isEnabled, user.sub);
  }

  @Delete("feature-flags/:id")
  @RequirePermissions("admin.feature-flags.manage")
  @ApiOperation({ summary: "Delete a feature flag." })
  async deleteFeatureFlag(@Param("id") id: string, @CurrentUser() user: AccessTokenPayload): Promise<{ deleted: true }> {
    await this.featureFlagAdminService.delete(id, user.sub);
    return { deleted: true };
  }

  // ── Health Dashboard / DB / Redis / Service / API / AI Monitoring ──
  @Get("system-health")
  @RequirePermissions("admin.health.read")
  @ApiOperation({ summary: "Aggregate platform health: database, Redis, queues, market data, AI providers." })
  getSystemHealth(): Promise<HealthDashboard> {
    return this.healthDashboardService.getHealthDashboard();
  }

  // ── Queue / Background Job / Scheduler Monitoring ───────────────────
  @Get("background-jobs")
  @RequirePermissions("admin.queue.read")
  @ApiOperation({ summary: "BullMQ job counts for every registered queue (email/sms/push/digest/scheduled)." })
  getBackgroundJobs(): Promise<QueueSnapshot[]> {
    return this.queueMonitoring.getAllQueueSnapshots();
  }

  @Get("background-jobs/scheduler")
  @RequirePermissions("admin.queue.read")
  @ApiOperation({ summary: "Scheduler Dashboard — every registered BullMQ repeatable job across all queues." })
  getScheduledJobs(): ReturnType<QueueMonitoringService["getRepeatableJobs"]> {
    return this.queueMonitoring.getRepeatableJobs();
  }

  // ── Cache Management / Redis Monitoring ─────────────────────────────
  @Get("cache")
  @RequirePermissions("admin.cache.manage")
  @ApiOperation({ summary: "Redis cache statistics." })
  getCacheStats(): Promise<CacheStats> {
    return this.cacheManagementService.getStats();
  }

  @Delete("cache")
  @RequirePermissions("admin.cache.manage")
  @ApiOperation({ summary: "Clear cache keys matching a prefix (never the whole cache)." })
  clearCache(@Body() dto: ClearCacheDto, @CurrentUser() user: AccessTokenPayload): Promise<{ deletedCount: number }> {
    return this.cacheManagementService.clearByPrefix(dto.prefix, user.sub);
  }

  // ── Database Monitoring / Storage Management ────────────────────────
  @Get("storage")
  @RequirePermissions("admin.storage.read")
  @ApiOperation({ summary: "Postgres table-size monitoring for the platform's largest tables." })
  getStorage(): Promise<TableStorageStat[]> {
    return this.storageManagementService.getStorageStats();
  }

  // ── License Management (Domain 1) ───────────────────────────────────
  @Get("licenses")
  @RequirePermissions("admin.license.manage")
  @ApiOperation({ summary: "List/search licenses." })
  listLicenses(@Query() query: LicenseQueryDto): Promise<PaginatedResult<License>> {
    return this.licenseService.list(
      { status: query.status, type: query.type, organizationId: query.organizationId },
      { page: query.page, pageSize: query.pageSize },
    );
  }

  @Post("licenses")
  @RequirePermissions("admin.license.manage")
  @ApiOperation({ summary: "Issue a new license." })
  issueLicense(@Body() dto: IssueLicenseDto, @CurrentUser() user: AccessTokenPayload): Promise<License> {
    return this.licenseService.issueLicense(
      { type: dto.type, seats: dto.seats, expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined, notes: dto.notes },
      user.sub,
    );
  }

  @Post("licenses/:id/assign")
  @RequirePermissions("admin.license.manage")
  @ApiOperation({ summary: "Assign a license to an organization — publishes LicenseAssigned." })
  assignLicense(
    @Param("id") id: string,
    @Body() dto: AssignLicenseDto,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<License> {
    return this.licenseService.assignToOrganization(id, dto.organizationId, user.sub);
  }

  @Post("licenses/:id/revoke")
  @RequirePermissions("admin.license.manage")
  @ApiOperation({ summary: "Revoke a license." })
  revokeLicense(@Param("id") id: string, @CurrentUser() user: AccessTokenPayload): Promise<License> {
    return this.licenseService.revoke(id, user.sub);
  }

  // ── System Announcements ────────────────────────────────────────────
  @Get("announcements")
  @RequirePermissions("admin.announcement.manage")
  @ApiOperation({ summary: "List all system announcements." })
  listAnnouncements(): Promise<SystemAnnouncement[]> {
    return this.announcementService.listAll();
  }

  @Post("announcements")
  @RequirePermissions("admin.announcement.manage")
  @ApiOperation({ summary: "Create a system announcement." })
  createAnnouncement(
    @Body() dto: CreateAnnouncementDto,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<SystemAnnouncement> {
    return this.announcementService.create(
      {
        title: dto.title,
        message: dto.message,
        severity: dto.severity ?? "INFO",
        startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
      },
      user.sub,
    );
  }

  @Patch("announcements/:id")
  @RequirePermissions("admin.announcement.manage")
  @ApiOperation({ summary: "Update a system announcement." })
  updateAnnouncement(
    @Param("id") id: string,
    @Body() dto: UpdateAnnouncementDto,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<SystemAnnouncement> {
    return this.announcementService.update(
      id,
      {
        title: dto.title,
        message: dto.message,
        severity: dto.severity,
        isActive: dto.isActive,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
      },
      user.sub,
    );
  }

  @Delete("announcements/:id")
  @RequirePermissions("admin.announcement.manage")
  @ApiOperation({ summary: "Delete a system announcement." })
  async deleteAnnouncement(@Param("id") id: string, @CurrentUser() user: AccessTokenPayload): Promise<{ deleted: true }> {
    await this.announcementService.delete(id, user.sub);
    return { deleted: true };
  }

  // ── Maintenance Mode ─────────────────────────────────────────────────
  @Get("maintenance-mode")
  @RequirePermissions("admin.maintenance.manage")
  @ApiOperation({ summary: "Current maintenance-mode state." })
  getMaintenanceMode(): Promise<MaintenanceWindow> {
    return this.maintenanceModeService.getState();
  }

  @Post("maintenance-mode/enable")
  @RequirePermissions("admin.maintenance.manage")
  @ApiOperation({ summary: "Enable maintenance mode — blocks mutating requests platform-wide (see MaintenanceModeMiddleware)." })
  enableMaintenanceMode(
    @Body() dto: EnableMaintenanceDto,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<MaintenanceWindow> {
    return this.maintenanceModeService.enable(dto.message, user.sub);
  }

  @Post("maintenance-mode/disable")
  @RequirePermissions("admin.maintenance.manage")
  @ApiOperation({ summary: "Disable maintenance mode." })
  disableMaintenanceMode(@CurrentUser() user: AccessTokenPayload): Promise<MaintenanceWindow> {
    return this.maintenanceModeService.disable(user.sub);
  }
}
