import { Injectable } from "@nestjs/common";
import { PlatformSetting } from "@rmsm/database";
import { loadConfig } from "@rmsm/config";
import { AuditService, AuditContext } from "../../auth/services/audit.service";
import { PlatformSettingRepository, UpsertPlatformSettingInput } from "../repositories/platform-setting.repository";

export interface SafeEnvironmentSnapshot {
  nodeEnv: string;
  databaseHost: string;
  redisHost: string;
}

/**
 * Domain 1's Application Configuration / Environment Configuration /
 * Platform Settings — three prompt-listed features backed by one model
 * (PlatformSetting) and one read-only, secret-redacting env snapshot.
 * "Environment Configuration" deliberately never returns full connection
 * strings (which carry credentials) — only host/scheme, enough to confirm
 * what environment is running without leaking secrets over an admin API,
 * consistent with this module's own established "credentials are never
 * re-displayed" convention (see notifications AdminNotificationController's
 * `redact()`).
 */
@Injectable()
export class ConfigurationService {
  constructor(
    private readonly settingRepository: PlatformSettingRepository,
    private readonly auditService: AuditService,
  ) {}

  listSettings(category?: string): Promise<PlatformSetting[]> {
    return this.settingRepository.findAll(category);
  }

  async upsertSetting(input: UpsertPlatformSettingInput, actorId: string, ctx: AuditContext = {}): Promise<PlatformSetting> {
    const setting = await this.settingRepository.upsert({ ...input, updatedById: actorId });
    await this.auditService.log("platform-setting.updated", {
      userId: actorId,
      entityType: "PlatformSetting",
      entityId: setting.id,
      metadata: { key: input.key, category: input.category },
      ...ctx,
    });
    return setting;
  }

  async deleteSetting(key: string, actorId: string, ctx: AuditContext = {}): Promise<void> {
    await this.settingRepository.delete(key);
    await this.auditService.log("platform-setting.deleted", {
      userId: actorId,
      entityType: "PlatformSetting",
      entityId: key,
      ...ctx,
    });
  }

  getEnvironmentSnapshot(): SafeEnvironmentSnapshot {
    const env = loadConfig();
    const safeHost = (url: string, fallbackScheme: string): string => {
      try {
        return new URL(url).hostname;
      } catch {
        return fallbackScheme;
      }
    };
    return {
      nodeEnv: env.NODE_ENV,
      databaseHost: safeHost(env.DATABASE_URL, "postgresql"),
      redisHost: safeHost(env.REDIS_URL, "redis"),
    };
  }
}
