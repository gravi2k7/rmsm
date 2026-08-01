import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from "class-validator";

/**
 * Module 003's 12 structured settings categories. Each category is its
 * own small, independently-optional DTO — a PATCH may touch one category
 * or all twelve. Storage is unchanged: `OrganizationService.
 * updateSettingsCategories()` merges whichever categories are present
 * into the SAME `Organization.settings` JSON column the pre-existing
 * `OrganizationSettingsDto`/`PATCH /organizations/:id/settings` endpoint
 * already writes to (no new column, no new table, no migration). This
 * DTO exists to give the 12 named categories real validation instead of
 * the wholesale free-form `settings: Record<string, unknown>` the
 * original endpoint accepts — both endpoints remain available and
 * continue to read/write the same underlying data.
 */
export class GeneralSettingsDto {
  @ApiPropertyOptional({ example: "en-US" })
  @IsOptional()
  @IsString()
  defaultLanguage?: string;

  @ApiPropertyOptional({ example: "YYYY-MM-DD" })
  @IsOptional()
  @IsString()
  dateFormat?: string;

  @ApiPropertyOptional({ example: "24h", enum: ["12h", "24h"] })
  @IsOptional()
  @IsIn(["12h", "24h"])
  timeFormat?: string;

  @ApiPropertyOptional({ example: "MONDAY", enum: ["SUNDAY", "MONDAY"] })
  @IsOptional()
  @IsIn(["SUNDAY", "MONDAY"])
  weekStart?: string;
}

export class SecuritySettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  enforceSso?: boolean;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ipAllowlist?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requireMfaForAdmins?: boolean;
}

export class BrandingSettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  primaryColor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  secondaryColor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  accentColor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  faviconUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  emailHeaderImageUrl?: string;
}

export class FeatureFlagsSettingsDto {
  @ApiPropertyOptional({
    type: "object",
    additionalProperties: { type: "boolean" },
    example: { betaDashboard: true },
  })
  @IsOptional()
  @IsObject()
  flags?: Record<string, boolean>;
}

export class ApiSettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100000)
  rateLimitPerMinute?: number;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedOrigins?: string[];
}

export class PasswordPolicySettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(8)
  @Max(128)
  minLength?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requireUppercase?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requireNumber?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requireSymbol?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(3650)
  maxAgeDays?: number;
}

export class SessionPolicySettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(43200)
  idleTimeoutMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  maxConcurrentSessions?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  rememberMeEnabled?: boolean;
}

export class MfaPolicySettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedMethods?: string[];
}

export class NotificationPreferencesSettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  emailDigest?: boolean;

  @ApiPropertyOptional({ example: "DAILY", enum: ["REALTIME", "DAILY", "WEEKLY"] })
  @IsOptional()
  @IsIn(["REALTIME", "DAILY", "WEEKLY"])
  digestFrequency?: string;
}

export class AiPreferencesSettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  defaultModel?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  usageLimitPerMonth?: number;
}

export class MarketDataPreferencesSettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  defaultProvider?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  refreshIntervalSeconds?: number;
}

export class TradingPreferencesSettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  defaultOrderType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  confirmBeforeTrade?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  riskWarningsEnabled?: boolean;
}

/**
 * Top-level structured settings PATCH body. Every category is optional —
 * a caller sends only the categories it wants to change, and
 * `OrganizationService.updateSettingsCategories()` merges each provided
 * category as a whole (category-level replace, not deep-merge within a
 * category) into the existing `settings` JSON under that category's own
 * key (`general`, `security`, `branding`, `featureFlags`, `api`,
 * `passwordPolicy`, `sessionPolicy`, `mfaPolicy`,
 * `notificationPreferences`, `aiPreferences`, `marketDataPreferences`,
 * `tradingPreferences`).
 */
export class UpdateOrganizationSettingsDto {
  @ApiPropertyOptional({ type: () => GeneralSettingsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => GeneralSettingsDto)
  general?: GeneralSettingsDto;

  @ApiPropertyOptional({ type: () => SecuritySettingsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => SecuritySettingsDto)
  security?: SecuritySettingsDto;

  @ApiPropertyOptional({ type: () => BrandingSettingsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => BrandingSettingsDto)
  branding?: BrandingSettingsDto;

  @ApiPropertyOptional({ type: () => FeatureFlagsSettingsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => FeatureFlagsSettingsDto)
  featureFlags?: FeatureFlagsSettingsDto;

  @ApiPropertyOptional({ type: () => ApiSettingsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ApiSettingsDto)
  api?: ApiSettingsDto;

  @ApiPropertyOptional({ type: () => PasswordPolicySettingsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => PasswordPolicySettingsDto)
  passwordPolicy?: PasswordPolicySettingsDto;

  @ApiPropertyOptional({ type: () => SessionPolicySettingsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => SessionPolicySettingsDto)
  sessionPolicy?: SessionPolicySettingsDto;

  @ApiPropertyOptional({ type: () => MfaPolicySettingsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => MfaPolicySettingsDto)
  mfaPolicy?: MfaPolicySettingsDto;

  @ApiPropertyOptional({ type: () => NotificationPreferencesSettingsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => NotificationPreferencesSettingsDto)
  notificationPreferences?: NotificationPreferencesSettingsDto;

  @ApiPropertyOptional({ type: () => AiPreferencesSettingsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => AiPreferencesSettingsDto)
  aiPreferences?: AiPreferencesSettingsDto;

  @ApiPropertyOptional({ type: () => MarketDataPreferencesSettingsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => MarketDataPreferencesSettingsDto)
  marketDataPreferences?: MarketDataPreferencesSettingsDto;

  @ApiPropertyOptional({ type: () => TradingPreferencesSettingsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => TradingPreferencesSettingsDto)
  tradingPreferences?: TradingPreferencesSettingsDto;
}

/** The fixed set of top-level settings category keys, in one place so the service layer never hand-types this list twice. */
export const ORGANIZATION_SETTINGS_CATEGORY_KEYS = [
  "general",
  "security",
  "branding",
  "featureFlags",
  "api",
  "passwordPolicy",
  "sessionPolicy",
  "mfaPolicy",
  "notificationPreferences",
  "aiPreferences",
  "marketDataPreferences",
  "tradingPreferences",
] as const;
