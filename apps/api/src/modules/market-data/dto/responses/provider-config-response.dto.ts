import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import type { MarketDataProviderType, AssetClass } from "@rmsm/database";

/** Deliberately excludes `credentialReference` — read-only, no credential exposure, per Phase 4's explicit requirement (the same redaction discipline as EP-005's AdminNotificationController, Module 005 Phase 5's security review). */
export class ProviderConfigResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() type!: MarketDataProviderType;
  @ApiProperty() name!: string;
  @ApiPropertyOptional() baseUrl?: string | null;
  @ApiPropertyOptional() rateLimitPerMinute?: number | null;
  @ApiProperty({ type: [String] }) supportedAssetClasses!: AssetClass[];
  @ApiProperty() isActive!: boolean;
}
