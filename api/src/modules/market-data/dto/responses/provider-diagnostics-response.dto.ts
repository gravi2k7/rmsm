import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import type { MarketDataProviderType } from "@rmsm/database";

export class CredentialStatusDto {
  @ApiProperty() providerType!: MarketDataProviderType;
  @ApiProperty({ enum: ["REQUIRED", "OPTIONAL", "NOT_APPLICABLE", "NOT_YET_IMPLEMENTED"] }) requirement!: string;
  @ApiProperty() configured!: boolean;
}

export class ProviderDiagnosticsResponseDto {
  @ApiProperty() providerConfigId!: string;
  @ApiProperty() providerType!: MarketDataProviderType;
  @ApiProperty() name!: string;
  @ApiProperty() isActive!: boolean;
  @ApiProperty() priority!: number;
  @ApiProperty() registered!: boolean;
  @ApiProperty() enabled!: boolean;
  @ApiProperty() circuitState!: string;
  @ApiPropertyOptional() rateLimitPerMinute?: number | null;
  @ApiProperty({ type: CredentialStatusDto }) credential!: CredentialStatusDto;
  @ApiPropertyOptional() lastConnectionTestAt?: Date | null;
  @ApiPropertyOptional() lastConnectionTestStatus?: string | null;
}

export class ConnectionTestResultResponseDto {
  @ApiProperty() providerConfigId!: string;
  @ApiProperty() providerType!: MarketDataProviderType;
  @ApiProperty() success!: boolean;
  @ApiPropertyOptional() latencyMs?: number;
  @ApiPropertyOptional() message?: string;
  @ApiProperty() testedAt!: Date;
}
